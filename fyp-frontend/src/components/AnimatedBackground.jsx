// src/components/AnimatedBackground.jsx
import React from 'react';

const AnimatedBackground = ({ pageType = "home" }) => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/90 via-white/90 to-purple-50/90 z-10"></div>
      
      {/* Animated SVG Background */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.05)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Animated Engineers */}
        <g className="engineer-group">
          {/* Engineer 1 */}
          <g transform="translate(100, 100)">
            <circle cx="0" cy="0" r="15" fill="#4F46E5" opacity="0.7">
              <animate attributeName="cy" values="0;-5;0" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="-5" r="8" fill="#ffffff" opacity="0.9">
              <animate attributeName="cy" values="-5;-10;-5" dur="3s" repeatCount="indefinite" />
            </circle>
            <rect x="-10" y="10" width="20" height="15" rx="2" fill="#4F46E5" opacity="0.7">
              <animate attributeName="y" values="10;5;10" dur="3s" repeatCount="indefinite" />
            </rect>
            <circle cx="5" cy="15" r="3" fill="#ffffff" opacity="0.9">
              <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
          
          {/* Engineer 2 */}
          <g transform="translate(300, 200)">
            <circle cx="0" cy="0" r="15" fill="#7C3AED" opacity="0.7">
              <animate attributeName="cy" values="0;5;0" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="-5" r="8" fill="#ffffff" opacity="0.9">
              <animate attributeName="cy" values="-5;0;-5" dur="4s" repeatCount="indefinite" />
            </circle>
            <rect x="-10" y="10" width="20" height="15" rx="2" fill="#7C3AED" opacity="0.7">
              <animate attributeName="y" values="10;15;10" dur="4s" repeatCount="indefinite" />
            </rect>
            <circle cx="5" cy="15" r="3" fill="#ffffff" opacity="0.9">
              <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
          
          {/* Engineer 3 */}
          <g transform="translate(500, 150)">
            <circle cx="0" cy="0" r="15" fill="#EC4899" opacity="0.7">
              <animate attributeName="cy" values="0;-3;0" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="-5" r="8" fill="#ffffff" opacity="0.9">
              <animate attributeName="cy" values="-5;-8;-5" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <rect x="-10" y="10" width="20" height="15" rx="2" fill="#EC4899" opacity="0.7">
              <animate attributeName="y" values="10;7;10" dur="3.5s" repeatCount="indefinite" />
            </rect>
            <circle cx="5" cy="15" r="3" fill="#ffffff" opacity="0.9">
              <animate attributeName="r" values="3;5;3" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </g>
          
          {/* Links being checked */}
          <g transform="translate(150, 120)">
            <rect x="0" y="0" width="60" height="10" rx="5" fill="#10B981" opacity="0.7">
              <animate attributeName="width" values="0;60;0" dur="5s" repeatCount="indefinite" />
            </rect>
            <circle cx="70" cy="5" r="5" fill="#10B981" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="5s" repeatCount="indefinite" />
              <animate attributeName="cx" values="70;80;70" dur="5s" repeatCount="indefinite" />
            </circle>
          </g>
          
          <g transform="translate(350, 220)">
            <rect x="0" y="0" width="60" height="10" rx="5" fill="#EF4444" opacity="0.7">
              <animate attributeName="width" values="0;60;0" dur="6s" repeatCount="indefinite" />
            </rect>
            <path d="M70,5 L75,0 L80,5 L75,10 Z" fill="#EF4444" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="6s" repeatCount="indefinite" />
              <animate attributeName="transform" values="translate(0,0);translate(10,0);translate(0,0)" dur="6s" repeatCount="indefinite" />
            </path>
          </g>
          
          <g transform="translate(550, 170)">
            <rect x="0" y="0" width="60" height="10" rx="5" fill="#10B981" opacity="0.7">
              <animate attributeName="width" values="0;60;0" dur="4s" repeatCount="indefinite" />
            </rect>
            <circle cx="70" cy="5" r="5" fill="#10B981" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" />
              <animate attributeName="cx" values="70;80;70" dur="4s" repeatCount="indefinite" />
            </circle>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default AnimatedBackground;