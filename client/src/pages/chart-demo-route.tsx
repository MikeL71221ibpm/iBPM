// Chart Demo Route - Simple access to chart export demo
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import ChartExportDemo from './chart-export-demo-05_20_25';

export default function ChartDemoRoute() {
  return <ChartExportDemo />;
}