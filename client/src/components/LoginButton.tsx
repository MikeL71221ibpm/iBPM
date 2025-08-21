import React from 'react';
import { UserPlus } from 'lucide-react';

export const LoginButton = () => {
  return (
    <div className="fixed top-3 right-4 z-50">
      <a 
        href="/" 
        className="no-underline bg-red-600 text-white px-4 py-2 rounded-md border-2 border-red-700 shadow-lg flex items-center"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        <span className="font-bold">SIGN IN</span>
      </a>
    </div>
  );
};

export default LoginButton;