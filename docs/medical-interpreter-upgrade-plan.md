# HealthPilot Medical Interpreter Upgrade Plan

**Version:** 2025-11-07  
**Goal:** Reduce PDF interpretation failures from ~80% to <15%  
**Current Success Rate:** ~20% (failing at exactly 0.50 confidence)  
**Target Success Rate:** 85%+

## Problem Analysis

### Root Causes Identified

1. **Floating-Point Edge Case (THRESH-001)**
   - Reports scoring exactly 0.50 are rejected due to `<` vs `≥` comparison
   - No epsilon tolerance for floating-point precision
   - **Impact:** ~50% of failures

2. **Harsh MIN() Aggregation (AGG-002)**
   - Current: `MIN(type, extraction, normalization)`
   - Single weak stage collapses entire pipeline
   - ChatGPT uses single-stage approach without multi-stage gating
   - **Impact:** ~30% of failures

3. **Implicit Extraction Confidence (EXT-003)**
   - Extraction confidence not explicitly calculated
   - Likely hardcoded or flat at 0.50
   - No per-field quality assessment
   - **Impact:** ~20% of failures

4. **PDF/OCR Limitations (OCR-004)**
   - pdf-parse fails on scanned/mixed PDFs
   - No layout detection for tables/multi-column
   - Vision API used too late in pipeline
   - **Impact:** Longer-term issue

### Current Thresholds

```typescript
type_detection: 0.20,      // Very lenient
extraction_min: 0.50,      // 🚨 Too strict (edge case)
normalization_min: 0.30,   // Lenient
overall_accept_min: 0.50   // 🚨 Edge case boundary
```

### Current Confidence Calculation

```typescript
// PROBLEM: MIN() is too harsh
const overallConfidence = Math.min(
  typeDetection.confidence,    // e.g., 0.90
  extraction.confidence,        // e.g., 0.50 ⚠️
  normalization.confidence      // e.g., 0.70
);
// Result: MIN(0.90, 0.50, 0.70) = 0.50
// Rejection: 0.50 < 0.50 ❌ (edge case!)
```

---

## Upgrade Phases

### **Phase 0: Observability (Pre-work)**
- ✅ Already completed - analysis document created
- Status: Understanding gained from external AI analysis

### **Phase 1: Quick Wins (Today) - CURRENT PHASE**

**Expected Impact:** 20% → 70-80% success rate

#### Changes:

1. **Fix Floating-Point Edge Case**
   - Add epsilon tolerance (1e-6) to comparisons
   - Use `>=` consistently with epsilon buffer
   - **Files:** `config.ts`, `pipeline.ts`

2. **Switch to Weighted Average**
   - Replace `MIN()` with weighted formula:
     ```typescript
     weighted = (type × 0.3) + (extraction × 0.5) + (normalization × 0.2)
     ```
   - Maintain hard floors for safety
   - **Files:** `config.ts`, `pipeline.ts`

3. **Lower Extraction Threshold**
   - `extraction_min: 0.50 → 0.40`
   - More forgiving for partial extractions
   - **Files:** `config.ts`

4. **Add Grey Zone Handling**
   - Extraction confidence 0.40-0.50 → return `partial` instead of `discard`
   - User can still review and accept partial results
   - **Files:** `config.ts`, `pipeline.ts`, `types.ts`

5. **Enhanced Logging**
   - Log all stage confidences explicitly
   - Track which stage causes failures
   - **Files:** `pipeline.ts`

#### Files Modified:
- `server/services/medical-interpreter/config.ts`
- `server/services/medical-interpreter/pipeline.ts`
- `server/services/medical-interpreter/types.ts`

---

### **Phase 2: Extraction Confidence (This Week)**

**Expected Impact:** 80% → 85% success rate

#### Changes:

1. **Per-Field Confidence Calculation**
   - Calculate extraction confidence based on:
     - Has numeric value (20%)
     - Has valid units (20%)
     - Within plausible bounds (20%)
     - Within reference range if provided (20%)
     - Source OCR quality (20%)
   - **Formula:** `confidence = Σ(field_weight × field_quality) / Σ(field_weight)`

2. **Schema-Enforced JSON Extraction**
   - Use OpenAI function calling with strict schema
   - Auto-retry on schema violations
   - Per-observation confidence field

3. **Improved Extraction Prompts**
   - Add few-shot examples (3 canonical lab reports)
   - Explicit unit preservation instructions
   - Request per-observation confidence and source coordinates

#### Files Modified:
- `server/services/medical-interpreter/extractors/labs.ts`
- `server/services/medical-interpreter/extractors/imaging.ts`

---

### **Phase 3: PDF/OCR Overhaul (Future Sprint)**

**Expected Impact:** 85% → 95% success rate

#### Changes:

1. **Multi-Strategy OCR**
   - Auto-detect: native text vs scanned vs mixed
   - Native pipeline: pdfjs-dist with layout reconstruction
   - Scanned pipeline: tesseract.js with pre-processing
   - Vision API: only for ambiguous regions (cost control)

2. **Layout Detection**
   - Table detection with ruled-line heuristics
   - Multi-column support
   - Reading order reconstruction

3. **Pre-Processing**
   - Auto-rotate, deskew, dewarp
   - Adaptive threshold, contrast enhancement
   - Denoise for scanned documents

4. **Table-Specific Extraction**
   - Dedicated table extractor
   - Column header mapping
   - Structured row extraction

#### New Packages:
- `pdfjs-dist`
- `tesseract.js`
- `sharp`
- `ucum-lhc` (units library)

#### New Files:
- `server/services/medical-interpreter/pdf/layout.ts`
- `server/services/medical-interpreter/pdf/ocr-preprocess.ts`
- `server/services/medical-interpreter/pdf/table-extractor.ts`
- `server/services/medical-interpreter/pdf/page-router.ts`

---

### **Phase 4: Test Harness & Validation (Ongoing)**

**Goal:** Prevent regressions, measure improvements

#### Components:

1. **Golden Dataset**
   - 50+ PDFs (native, scanned, mixed, rotated, low-contrast)
   - Ground truth JSON targets
   - Path: `server/services/medical-interpreter/tests/golden/`

2. **Metrics**
   - Document success rate
   - Per-field precision/recall
   - Table detection F1 score
   - Cost/time per document

3. **CI Integration**
   - Run on PR with feature flags
   - Block merge if regression >2%

---

## Configuration Changes

### Phase 1 Config (Immediate)

```typescript
// server/services/medical-interpreter/config.ts
export const THRESHOLDS: Thresholds = {
  type_detection: 0.20,
  extraction_min: 0.40,        // Lowered from 0.50
  normalization_min: 0.30,
  overall_accept_min: 0.50,
};

export const AGGREGATION = {
  use_weighted_average: true,  // New: replaces MIN()
  weights: {
    type: 0.3,
    extraction: 0.5,
    normalization: 0.2,
  },
  epsilon: 1e-6,               // New: floating-point tolerance
};

export const GREY_ZONE = {
  extraction_lower: 0.40,
  extraction_upper: 0.50,
  emit_partial_instead_of_discard: true,
};
```

---

## Testing Strategy

### Manual Testing (Phase 1)

1. **Upload failing reports** that previously scored 0.50
2. **Check server logs** for new confidence calculations
3. **Verify acceptance** of reports with weighted scores ≥0.50
4. **Test grey zone** with extraction confidence 0.40-0.49

### Expected Log Output

```
🏷️  Classification: Observation_Labs (score: 0.85, confidence: 0.90)
📊 Extraction: confidence=0.48 (grey zone)
✅ Normalization: confidence=0.70
📊 Confidence breakdown:
   Type: 0.90 (weight: 0.3)
   Extraction: 0.48 (weight: 0.5)
   Normalization: 0.70 (weight: 0.2)
   Weighted: 0.90×0.3 + 0.48×0.5 + 0.70×0.2 = 0.65
   Threshold: 0.50 (with epsilon: 0.499999)
   Result: ACCEPTED (weighted: 0.65 >= 0.50) ✅
   Grey zone: extraction 0.48 in range [0.40, 0.50] → marked as partial
```

---

## Rollback Plan

### If Phase 1 Causes Issues:

1. **Feature Flag Approach** (Recommended)
   ```typescript
   const USE_WEIGHTED_AVERAGE = process.env.INTERPRETER_USE_WEIGHTED === 'true';
   ```

2. **Git Revert**
   ```bash
   git revert <commit-hash>
   npm run db:push --force
   ```

3. **Emergency Config Override**
   ```typescript
   // Revert to MIN() approach
   export const AGGREGATION = {
     use_weighted_average: false,
   };
   ```

---

## Success Metrics

### Phase 1 Targets (Today)
- ✅ Success rate: 20% → 70%+
- ✅ No increase in false positives (invalid data accepted)
- ✅ Grey zone reports properly flagged as "partial"

### Phase 2 Targets (This Week)
- ✅ Success rate: 70% → 85%
- ✅ Per-field extraction confidence calculated
- ✅ Schema-enforced extraction with retries

### Phase 3 Targets (Future)
- ✅ Success rate: 85% → 95%
- ✅ Multi-column PDF support
- ✅ Table extraction accuracy >90%

---

## References

- **Original Analysis:** `attached_assets/Pasted--title-HealthPilot-Medical-Interpreter-Reliability-PDF-OCR-Overhaul-version-2025--*.txt`
- **Code Locations:**
  - Main pipeline: `server/services/medical-interpreter/pipeline.ts`
  - Configuration: `server/services/medical-interpreter/config.ts`
  - Lab extraction: `server/services/medical-interpreter/extractors/labs.ts`
  - OCR: `server/services/medical-interpreter/ocr.ts`

---

## Next Steps

1. ✅ Review this document
2. ⏳ Implement Phase 1 changes (today)
3. ⏳ Test with previously failing reports
4. ⏳ Monitor success rate for 24-48 hours
5. ⏳ Proceed to Phase 2 if stable
