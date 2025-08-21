import React from 'react';
import ProcessingTimeCalculator from '@/components/ProcessingTimeCalculator';
import MainContentWrapper from '@/components/MainContentWrapper';

export default function ProcessingCalculatorPage() {
  return (
    <MainContentWrapper>
      <div className="py-6">
        <h1 className="text-2xl font-bold mb-6">Data Processing Time Estimator</h1>
        <p className="mb-6 text-gray-600 max-w-4xl">
          Use this calculator to estimate how long your data processing will take. Enter details about your file size, 
          number of records, and average note length to get an estimate broken down by processing phase.
        </p>
        <ProcessingTimeCalculator />
      </div>
    </MainContentWrapper>
  );
}