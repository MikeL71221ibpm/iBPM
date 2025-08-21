import React from 'react';

const VERSION = "V3.4.8-websocket-iterator-fix-07_30_25";
const BUILD_DATE = "July 30, 2025";

export const VersionDisplay: React.FC = () => {
  return (
    <div className="fixed bottom-2 left-2 z-50 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded border opacity-60 hover:opacity-100 transition-opacity">
      <div>{VERSION}</div>
      <div>{BUILD_DATE}</div>
    </div>
  );
};

export const getVersion = () => VERSION;
export const getBuildDate = () => BUILD_DATE;