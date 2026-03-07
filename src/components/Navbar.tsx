import React from 'react';

const Navbar: React.FC = () => {
    return (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 p-6 shadow-lg border-b-4 border-yellow-400">
            {/* Left Logo */}
            <div className="flex-shrink-0 transform hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-yellow-400 p-1">
                    <img
                        src="/apcid.jpg"
                        alt="Left Logo"
                        className="w-full h-full object-cover rounded-full"
                    />
                </div>
            </div>

            {/* Title */}
            <div className="text-center flex-1 mx-8">
                <h1 className="text-white text-2xl md:text-3xl font-bold tracking-wide mb-1 drop-shadow-lg uppercase">
                    AP SPECIAL POLICE FORCE RECRUITMENT
                </h1>
            </div>

            {/* Right Logo */}
            <div className="flex-shrink-0 transform hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-yellow-400 p-1">
                    <img
                        src="/ap_police.png"
                        alt="Right Logo"
                        className="w-full h-full object-cover rounded-full"
                    />
                </div>
            </div>
        </div>
    );
};

export default Navbar;