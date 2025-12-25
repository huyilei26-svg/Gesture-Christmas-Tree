import React, { useState, useEffect, useCallback } from 'react';
import HandManager from './components/HandManager';
import ChristmasScene from './components/ChristmasScene';
import { AppState, HandGesture } from './types';

// Default photos to make the tree look good initially
const DEFAULT_PHOTOS = [
  'https://picsum.photos/400/400?random=1',
  'https://picsum.photos/400/400?random=2',
  'https://picsum.photos/400/400?random=3',
  'https://picsum.photos/400/400?random=4',
  'https://picsum.photos/400/400?random=5',
  'https://picsum.photos/400/400?random=6',
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.TREE);
  const [photos, setPhotos] = useState<string[]>(DEFAULT_PHOTOS);
  const [hasCustomPhotos, setHasCustomPhotos] = useState(false);
  const [gesture, setGesture] = useState<HandGesture>({
    isFist: false,
    isOpenPalm: false,
    isPinching: false,
    handPosition: { x: 0.5, y: 0.5 },
    rotation: 0
  });

  const [permissionGranted, setPermissionGranted] = useState(false);

  // Gesture State Machine Logic
  const handleGestureUpdate = useCallback((newGesture: HandGesture) => {
    setGesture(newGesture);

    // State Transitions based on gestures with simple debouncing logic needed in real world,
    // but for this direct mapping:
    if (newGesture.isFist) {
      setAppState(AppState.TREE);
    } else if (newGesture.isOpenPalm) {
      // Only switch to Exploded if not already focusing
      if (appState !== AppState.EXPLODED && appState !== AppState.FOCUS) {
         setAppState(AppState.EXPLODED);
      }
      // If we are focusing and open palm, maybe go back to exploded?
      if (appState === AppState.FOCUS) {
          setAppState(AppState.EXPLODED);
      }
    } else if (newGesture.isPinching) {
      if (appState === AppState.EXPLODED) {
          setAppState(AppState.FOCUS);
      }
    }
  }, [appState]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newPhotos: string[] = [];
      Array.from(event.target.files).forEach(file => {
        newPhotos.push(URL.createObjectURL(file as Blob));
      });
      
      setPhotos(prev => {
          // If this is the first custom upload, clear the random defaults
          if (!hasCustomPhotos) {
              return newPhotos;
          }
          // Otherwise append to the existing custom list
          return [...prev, ...newPhotos];
      });
      setHasCustomPhotos(true);
    }
  };

  const startExperience = () => {
      setPermissionGranted(true);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      
      {/* 3D Scene Layer */}
      {permissionGranted && (
          <div className="absolute inset-0 z-0">
            <ChristmasScene appState={appState} gesture={gesture} photos={photos} />
          </div>
      )}

      {/* Logic Layer */}
      {permissionGranted && <HandManager onGestureUpdate={handleGestureUpdate} />}

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-500 drop-shadow-lg filter font-serif">
              Merry Christmas
            </h1>
            <p className="text-yellow-100/80 mt-1 font-light tracking-widest text-xs md:text-sm uppercase">
              Gesture Controlled Experience
            </p>
          </div>

          <div className="pointer-events-auto flex flex-col items-end gap-2">
             <label className="cursor-pointer bg-red-900/90 hover:bg-red-700 text-white px-4 py-2 rounded-lg border border-red-500/50 transition-all backdrop-blur-sm text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(200,30,58,0.4)] group">
                <span className="text-xl group-hover:rotate-12 transition-transform">🎁</span>
                <span>Add Photos</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
             </label>
             
             {/* Hint for customization */}
             {permissionGranted && !hasCustomPhotos && (
                 <div className="bg-black/60 border border-yellow-500/30 text-yellow-100 text-xs p-2 rounded max-w-[150px] text-right animate-pulse">
                    Tap above to hang your own memories!
                 </div>
             )}
          </div>
        </div>

        {/* Start Screen / Instructions */}
        {!permissionGranted ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto z-50 p-4">
                <div className="text-center max-w-xl w-full p-8 md:p-12 border border-yellow-500/30 rounded-3xl bg-gradient-to-b from-gray-900 to-black shadow-[0_0_60px_rgba(255,215,0,0.15)] relative overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-yellow-500 shadow-[0_0_40px_rgba(255,215,0,0.8)]"></div>

                    <h2 className="text-4xl text-yellow-400 mb-4 font-serif tracking-wide">Holiday Magic</h2>
                    <p className="text-gray-300 mb-8 leading-relaxed text-lg">
                        A 3D Christmas Tree powered by your hands.<br/>
                        <span className="text-sm opacity-60">Enable camera to explore.</span>
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button 
                            onClick={startExperience}
                            className="w-full sm:w-auto bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3 px-8 rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,215,0,0.5)] active:scale-95"
                        >
                            Start Experience
                        </button>
                        
                        <div className="text-gray-500 text-sm font-serif italic">- or -</div>

                        <label className="w-full sm:w-auto cursor-pointer bg-white/5 hover:bg-white/10 text-yellow-100 border border-white/10 py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 group">
                            <span className="group-hover:scale-110 transition-transform">📷</span>
                            <span>Upload & Start</span>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                    handlePhotoUpload(e);
                                    startExperience();
                                }} 
                            />
                        </label>
                    </div>
                </div>
            </div>
        ) : (
            /* Controls Overlay */
            <div className="mb-4">
                <div className="flex gap-4 md:gap-8 justify-center items-end text-xs md:text-sm text-yellow-100/60 font-mono">
                    <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${gesture.isFist ? 'opacity-100 text-yellow-300 scale-110' : 'opacity-40'}`}>
                        <div className="w-12 h-12 border border-current rounded-full flex items-center justify-center bg-white/5 text-xl">✊</div>
                        <span>ASSEMBLE</span>
                    </div>
                    <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${gesture.isOpenPalm ? 'opacity-100 text-yellow-300 scale-110' : 'opacity-40'}`}>
                        <div className="w-12 h-12 border border-current rounded-full flex items-center justify-center bg-white/5 text-xl">🖐</div>
                        <span>EXPLODE</span>
                    </div>
                    <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${gesture.isPinching ? 'opacity-100 text-yellow-300 scale-110' : 'opacity-40'}`}>
                        <div className="w-12 h-12 border border-current rounded-full flex items-center justify-center bg-white/5 text-xl">👌</div>
                        <span>FOCUS</span>
                    </div>
                     <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${appState === AppState.EXPLODED ? 'opacity-100 text-yellow-300 scale-110' : 'opacity-40'}`}>
                        <div className="w-12 h-12 border border-current rounded-full flex items-center justify-center bg-white/5 text-xl">↔</div>
                        <span>MOVE</span>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;