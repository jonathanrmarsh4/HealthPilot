// OCR Service using OpenAI Vision API for images and pdf-parse for PDFs
// Extracts text from PDF/image medical reports with quality assessment

import { getOpenAI } from './client';
import type { OCROutput } from './types';
import fs from 'fs/promises';

/**
 * Extract text from a medical report image or PDF
 * @param filePath - Path to the uploaded file
 * @returns OCR output with extracted text, quality score, and confidence
 */
export async function extractTextFromFile(filePath: string): Promise<OCROutput> {
  try {
    const isPDF = filePath.toLowerCase().endsWith('.pdf');

    let extractedText = '';
    let usedVisionFallback = false;

    if (isPDF) {
      // Try pdf-parse first for text-based PDFs
      console.log('📄 Extracting text from PDF using pdf-parse...');
      const { PDFParse } = await import('pdf-parse');
      const fileBuffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: fileBuffer });
      const textResult = await parser.getText();
      extractedText = textResult.text;
      console.log(`✅ PDF text extracted: ${extractedText.length} characters (${textResult.pages.length} pages)`);
      
      // Check if this is likely a scanned PDF (very little text extracted)
      const charsPerPage = extractedText.length / textResult.pages.length;
      if (charsPerPage < 50) {
        console.log(`⚠️  Low text density detected (${charsPerPage.toFixed(0)} chars/page) - likely scanned PDF`);
        console.log('🔄 Attempting Vision API extraction on PDF pages as images...');
        
        try {
          // Convert PDF pages to PNG images, then send to Vision API
          const { pdfToPng } = await import('pdf-to-png-converter');
          const pngPages = await pdfToPng(filePath, {
            outputFolder: '/tmp',
            disableFontFace: false,
            viewportScale: 2.0,
            outputFileMask: `page`,
          });
          
          console.log(`🖼️  Converted PDF to ${pngPages.length} PNG images`);
          
          // Extract text from each page using Vision API
          let combinedVisionText = '';
          for (let i = 0; i < Math.min(pngPages.length, 5); i++) {
            const page = pngPages[i];
            const base64Image = page.content.toString('base64');
            
            const response = await getOpenAI().chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'You are a medical document OCR system. Extract ALL visible text accurately, preserving structure, numbers, units, and reference ranges.',
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Extract all visible text from page ${i + 1} of this medical report. Include ALL text: patient info, test names, values, units, reference ranges, dates, and any other visible text.`,
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/png;base64,${base64Image}`,
                      },
                    },
                  ],
                },
              ],
              max_tokens: 4000,
            });

            const pageText = response.choices[0]?.message?.content || '';
            combinedVisionText += pageText + '\n\n';
            console.log(`   Page ${i + 1}: ${pageText.length} characters extracted`);
          }

          console.log(`✅ Vision API extraction complete: ${combinedVisionText.length} characters total`);
          console.log(`📝 First 300 chars: ${combinedVisionText.substring(0, 300)}...`);
          
          // Use Vision text if it's better than pdf-parse
          if (combinedVisionText.length > extractedText.length) {
            extractedText = combinedVisionText;
            usedVisionFallback = true;
          }
        } catch (visionError) {
          console.error('❌ Vision API extraction failed:', visionError);
          // Continue with pdf-parse text (better than nothing)
        }
      }
    } else {
      // Use OpenAI Vision API for images (PNG, JPEG, JPG)
      console.log('🖼️  Extracting text from image using OpenAI Vision API...');
      const fileBuffer = await fs.readFile(filePath);
      const base64Image = fileBuffer.toString('base64');
      
      // Determine MIME type
      let mimeType = 'image/png';
      if (filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      }

      // Use OpenAI Vision to extract text
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a medical document OCR system. Extract all text from medical reports accurately. Preserve structure, numbers, units, and reference ranges exactly as shown. Output only the extracted text, maintaining the original formatting and layout.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this medical report. Preserve exact values, units, reference ranges, and structure.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
      });

      extractedText = response.choices[0]?.message?.content || '';
      console.log(`✅ Image OCR complete: ${extractedText.length} characters`);
    }

    // Assess quality based on text characteristics
    const qualityScore = assessTextQuality(extractedText);
    const confidence = qualityScore > 0.6 ? 0.9 : (usedVisionFallback ? 0.85 : 0.7);

    console.log(`📊 Quality assessment: score=${qualityScore.toFixed(2)}, confidence=${confidence.toFixed(2)}`);

    return {
      text: extractedText,
      quality_score: qualityScore,
      confidence,
    };
  } catch (error) {
    console.error('❌ OCR extraction error:', error);
    return {
      text: '',
      quality_score: 0,
      confidence: 0,
    };
  }
}

/**
 * Assess the quality of extracted text
 * @param text - Extracted text
 * @returns Quality score between 0 and 1
 */
function assessTextQuality(text: string): number {
  if (!text || text.length < 50) {
    return 0.1;
  }

  let score = 0.5; // Base score

  // Check for medical keywords
  const medicalKeywords = [
    'patient', 'test', 'result', 'value', 'range', 'reference',
    'normal', 'abnormal', 'lab', 'blood', 'specimen', 'collected',
  ];
  const keywordMatches = medicalKeywords.filter(kw => 
    text.toLowerCase().includes(kw)
  ).length;
  score += (keywordMatches / medicalKeywords.length) * 0.3;

  // Check for numeric values (typical in lab reports)
  const numberCount = (text.match(/\d+\.?\d*/g) || []).length;
  if (numberCount > 5) score += 0.1;

  // Check for units (typical in lab reports)
  const unitPatterns = /mg\/dL|mmol\/L|g\/L|U\/L|%|bpm|mmHg/gi;
  if (unitPatterns.test(text)) score += 0.1;

  return Math.min(score, 1.0);
}
