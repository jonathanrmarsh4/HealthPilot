import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { healthKitService } from '@/services/healthkit';
import { CheckCircle2, XCircle, Activity, Database, AlertCircle } from 'lucide-react';

type TestResult = {
  dataType: string;
  status: 'pending' | 'success' | 'error';
  count?: number;
  error?: string;
  samples?: any[];
};

export default function HealthKitDiagnostics() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);

  const dataTypes = [
    { key: 'steps', name: 'Steps', category: 'Activity' },
    { key: 'distance', name: 'Distance', category: 'Activity' },
    { key: 'activeCalories', name: 'Active Calories', category: 'Activity' },
    { key: 'basalCalories', name: 'Basal Calories', category: 'Activity' },
    { key: 'flightsClimbed', name: 'Flights Climbed', category: 'Activity' },
    { key: 'heartRate', name: 'Heart Rate', category: 'Heart & Vitals' },
    { key: 'restingHeartRate', name: 'Resting Heart Rate', category: 'Heart & Vitals' },
    { key: 'hrv', name: 'Heart Rate Variability (HRV)', category: 'Heart & Vitals' },
    { key: 'oxygenSaturation', name: 'Oxygen Saturation (SpO2)', category: 'Heart & Vitals' },
    { key: 'respiratoryRate', name: 'Respiratory Rate', category: 'Heart & Vitals' },
    { key: 'bodyTemperature', name: 'Body Temperature', category: 'Heart & Vitals' },
    { key: 'weight', name: 'Weight', category: 'Body Measurements' },
    { key: 'bmi', name: 'BMI', category: 'Body Measurements' },
    { key: 'leanBodyMass', name: 'Lean Body Mass', category: 'Body Measurements' },
    { key: 'bodyFat', name: 'Body Fat %', category: 'Body Measurements' },
    { key: 'height', name: 'Height', category: 'Body Measurements' },
    { key: 'waistCircumference', name: 'Waist Circumference', category: 'Body Measurements' },
    { key: 'bloodPressureSystolic', name: 'Blood Pressure (Systolic)', category: 'Lab Results' },
    { key: 'bloodPressureDiastolic', name: 'Blood Pressure (Diastolic)', category: 'Lab Results' },
    { key: 'bloodGlucose', name: 'Blood Glucose', category: 'Lab Results' },
    { key: 'dietaryWater', name: 'Water Intake', category: 'Nutrition' },
    { key: 'dietaryEnergy', name: 'Calories Consumed', category: 'Nutrition' },
    { key: 'dietaryProtein', name: 'Protein', category: 'Nutrition' },
    { key: 'dietaryCarbs', name: 'Carbohydrates', category: 'Nutrition' },
    { key: 'dietaryFat', name: 'Fat', category: 'Nutrition' },
    { key: 'workouts', name: 'Workouts', category: 'Activity' },
    { key: 'sleep', name: 'Sleep Analysis', category: 'Sleep' },
  ];

  const checkAvailability = async () => {
    try {
      const available = await healthKitService.isHealthKitAvailable();
      setIsAvailable(available);
    } catch (error) {
      console.error('Availability check failed:', error);
      setIsAvailable(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await healthKitService.requestPermissions();
      setPermissionGranted(granted);
    } catch (error) {
      console.error('Permission request failed:', error);
      setPermissionGranted(false);
    }
  };

  const testDataType = async (dataTypeKey: string) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    setTestResults(prev => [
      ...prev.filter(r => r.dataType !== dataTypeKey),
      { dataType: dataTypeKey, status: 'pending' }
    ]);

    try {
      let result: any;
      const service = healthKitService as any;

      switch (dataTypeKey) {
        case 'steps':
          result = await service.getSteps(startDate, endDate);
          break;
        case 'distance':
          result = await service.getDistance(startDate, endDate);
          break;
        case 'activeCalories':
          result = await service.getActiveCalories(startDate, endDate);
          break;
        case 'basalCalories':
          result = await service.getBasalCalories(startDate, endDate);
          break;
        case 'flightsClimbed':
          result = await service.getFlightsClimbed(startDate, endDate);
          break;
        case 'heartRate':
          result = await service.getHeartRate(startDate, endDate);
          break;
        case 'restingHeartRate':
          result = await service.getRestingHeartRate(startDate, endDate);
          break;
        case 'hrv':
          result = await service.getHRV(startDate, endDate);
          break;
        case 'oxygenSaturation':
          result = await service.getOxygenSaturation(startDate, endDate);
          break;
        case 'respiratoryRate':
          result = await service.getRespiratoryRate(startDate, endDate);
          break;
        case 'bodyTemperature':
          result = await service.getBodyTemperature(startDate, endDate);
          break;
        case 'weight':
          result = await service.getWeight(startDate, endDate);
          break;
        case 'bmi':
          result = await service.getBMI(startDate, endDate);
          break;
        case 'leanBodyMass':
          result = await service.getLeanBodyMass(startDate, endDate);
          break;
        case 'bodyFat':
          result = await service.getBodyFat(startDate, endDate);
          break;
        case 'height':
          result = await service.getHeight(startDate, endDate);
          break;
        case 'waistCircumference':
          result = await service.getWaistCircumference(startDate, endDate);
          break;
        case 'bloodPressureSystolic':
          result = await service.getBloodPressureSystolic(startDate, endDate);
          break;
        case 'bloodPressureDiastolic':
          result = await service.getBloodPressureDiastolic(startDate, endDate);
          break;
        case 'bloodGlucose':
          result = await service.getBloodGlucose(startDate, endDate);
          break;
        case 'dietaryWater':
          result = await service.getDietaryWater(startDate, endDate);
          break;
        case 'dietaryEnergy':
          result = await service.getDietaryEnergy(startDate, endDate);
          break;
        case 'dietaryProtein':
          result = await service.getDietaryProtein(startDate, endDate);
          break;
        case 'dietaryCarbs':
          result = await service.getDietaryCarbs(startDate, endDate);
          break;
        case 'dietaryFat':
          result = await service.getDietaryFat(startDate, endDate);
          break;
        case 'workouts':
          result = await service.getWorkouts(startDate, endDate);
          break;
        case 'sleep':
          result = await service.getSleep(startDate, endDate);
          break;
        default:
          throw new Error(`Unknown data type: ${dataTypeKey}`);
      }

      setTestResults(prev => [
        ...prev.filter(r => r.dataType !== dataTypeKey),
        {
          dataType: dataTypeKey,
          status: 'success',
          count: Array.isArray(result) ? result.length : 0,
          samples: Array.isArray(result) ? result.slice(0, 5) : []
        }
      ]);
    } catch (error: any) {
      setTestResults(prev => [
        ...prev.filter(r => r.dataType !== dataTypeKey),
        {
          dataType: dataTypeKey,
          status: 'error',
          error: error.message || 'Unknown error'
        }
      ]);
    }
  };

  const testAllDataTypes = async () => {
    setIsTestingAll(true);
    setTestResults([]);
    
    for (const dataType of dataTypes) {
      await testDataType(dataType.key);
    }
    
    setIsTestingAll(false);
  };

  const groupedDataTypes = dataTypes.reduce((acc, dt) => {
    if (!acc[dt.category]) {
      acc[dt.category] = [];
    }
    acc[dt.category].push(dt);
    return acc;
  }, {} as Record<string, typeof dataTypes>);

  const getResultForDataType = (dataTypeKey: string) => {
    return testResults.find(r => r.dataType === dataTypeKey);
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const totalSamples = testResults.reduce((sum, r) => sum + (r.count || 0), 0);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HealthKit Diagnostics</h1>
          <p className="text-muted-foreground">Test and validate HealthKit plugin integration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAvailable === null ? (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" data-testid="icon-availability-unknown" />
                ) : isAvailable ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" data-testid="icon-availability-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" data-testid="icon-availability-error" />
                )}
                <span className="text-2xl font-bold" data-testid="text-availability-status">
                  {isAvailable === null ? 'Unknown' : isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <Button onClick={checkAvailability} size="sm" data-testid="button-check-availability">
                Check
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {permissionGranted === null ? (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" data-testid="icon-permission-unknown" />
                ) : permissionGranted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" data-testid="icon-permission-granted" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" data-testid="icon-permission-denied" />
                )}
                <span className="text-2xl font-bold" data-testid="text-permission-status">
                  {permissionGranted === null ? 'Not Requested' : permissionGranted ? 'Granted' : 'Denied'}
                </span>
              </div>
              <Button onClick={requestPermissions} size="sm" data-testid="button-request-permissions">
                Request
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Success:</span>
                <Badge variant="default" data-testid="badge-success-count">{successCount}/{dataTypes.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Errors:</span>
                <Badge variant="destructive" data-testid="badge-error-count">{errorCount}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Samples:</span>
                <Badge variant="secondary" data-testid="badge-total-samples">{totalSamples}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Types Test Suite</CardTitle>
              <CardDescription>Test individual data types or run all tests (last 7 days)</CardDescription>
            </div>
            <Button
              onClick={testAllDataTypes}
              disabled={isTestingAll}
              data-testid="button-test-all"
            >
              <Database className="h-4 w-4 mr-2" />
              {isTestingAll ? 'Testing...' : 'Test All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {Object.entries(groupedDataTypes).map(([category, types]) => (
              <div key={category} className="mb-6">
                <h3 className="font-semibold text-lg mb-3">{category}</h3>
                <div className="space-y-2">
                  {types.map(dataType => {
                    const result = getResultForDataType(dataType.key);
                    return (
                      <div
                        key={dataType.key}
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => setSelectedResult(result || null)}
                        data-testid={`card-datatype-${dataType.key}`}
                      >
                        <div className="flex items-center gap-3">
                          {result?.status === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" data-testid={`icon-status-${dataType.key}-success`} />
                          ) : result?.status === 'error' ? (
                            <XCircle className="h-5 w-5 text-destructive" data-testid={`icon-status-${dataType.key}-error`} />
                          ) : result?.status === 'pending' ? (
                            <Activity className="h-5 w-5 text-blue-500 animate-pulse" data-testid={`icon-status-${dataType.key}-pending`} />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-muted-foreground" data-testid={`icon-status-${dataType.key}-unknown`} />
                          )}
                          <div>
                            <div className="font-medium" data-testid={`text-datatype-${dataType.key}-name`}>{dataType.name}</div>
                            {result && (
                              <div className="text-sm text-muted-foreground">
                                {result.status === 'success' && (
                                  <span data-testid={`text-datatype-${dataType.key}-count`}>{result.count} samples</span>
                                )}
                                {result.status === 'error' && (
                                  <span className="text-destructive" data-testid={`text-datatype-${dataType.key}-error`}>{result.error}</span>
                                )}
                                {result.status === 'pending' && <span>Testing...</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            testDataType(dataType.key);
                          }}
                          size="sm"
                          variant="outline"
                          disabled={result?.status === 'pending'}
                          data-testid={`button-test-${dataType.key}`}
                        >
                          Test
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Separator className="mt-4" />
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedResult && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Data: {dataTypes.find(dt => dt.key === selectedResult.dataType)?.name}</CardTitle>
            <CardDescription>First 5 samples from the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto" data-testid="text-sample-data">
                {JSON.stringify(selectedResult.samples || [], null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
