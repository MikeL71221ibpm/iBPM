import React from 'react';

interface MainContentWrapperProps {
  children: React.ReactNode;
}

/**
 * MainContentWrapper component that provides consistent width and spacing for all pages
 * Creates a centered layout that uses ~75% of the screen width on larger displays
 */
const MainContentWrapper: React.FC<MainContentWrapperProps> = ({ children }) => {
  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6">
      <div className="w-full mx-auto max-w-[95%] sm:max-w-[90%] md:max-w-[85%] lg:max-w-[80%] xl:max-w-[75%]">
        {children}
      </div>
    </div>
  );
};

export default MainContentWrapper;