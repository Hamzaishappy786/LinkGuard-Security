// src/components/BackgroundVideo.jsx
import React, { useRef, useEffect, useState } from 'react';

const BackgroundVideo = ({ videoSrc, pageType = "home" }) => {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    
    if (video) {
      video.playbackRate = 0.7; // Slow down the video for a calmer effect
      video.volume = 0; // Muted by default
      video.loop = true;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      
      // Try to autoplay the video
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.then(_ => {
          // Autoplay started
          setIsLoaded(true);
        }).catch(error => {
          // Autoplay was prevented
          console.log("Autoplay was prevented:", error);
          // Add a click listener to start the video on user interaction
          const startVideo = () => {
            video.play();
            document.removeEventListener('click', startVideo);
          };
          document.addEventListener('click', startVideo);
        });
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/90 via-white/90 to-purple-50/90 z-10"></div>
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}
        src={videoSrc}
        poster={`/images/${pageType}-bg-poster.jpg`}
        muted
        loop
        playsInline
        aria-hidden="true"
      />
    </div>
  );
};

export default BackgroundVideo;