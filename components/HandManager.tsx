import React, { useEffect, useRef } from 'react';
import * as mediapipeHands from '@mediapipe/hands';
import * as cameraUtils from '@mediapipe/camera_utils';
import { HandGesture } from '../types';

// Define loose type for Results
type Results = any; 

interface Props {
  onGestureUpdate: (gesture: HandGesture) => void;
}

const HandManager: React.FC<Props> = ({ onGestureUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onGestureUpdateRef = useRef(onGestureUpdate);

  useEffect(() => {
    onGestureUpdateRef.current = onGestureUpdate;
  }, [onGestureUpdate]);
  
  useEffect(() => {
    if (!videoRef.current) return;

    // Robustly access exports, handling potential CommonJS/ESM interop differences
    const mpHands: any = mediapipeHands;
    const mpCamera: any = cameraUtils;

    const Hands = mpHands.Hands || mpHands.default?.Hands;
    const Camera = mpCamera.Camera || mpCamera.default?.Camera;

    if (!Hands || !Camera) {
      console.error("Failed to load MediaPipe modules. Check imports.");
      return;
    }

    const hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results: Results) => {
      let gestureData: HandGesture;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // 1. Detect Open Palm vs Fist
        const wrist = landmarks[0];
        const tips = [8, 12, 16, 20];
        let avgDist = 0;
        
        tips.forEach((idx: number) => {
          const dx = landmarks[idx].x - wrist.x;
          const dy = landmarks[idx].y - wrist.y;
          avgDist += Math.sqrt(dx*dx + dy*dy);
        });
        avgDist /= tips.length;

        const isFist = avgDist < 0.25; 
        const isOpenPalm = avgDist > 0.4;

        // 2. Detect Pinch
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const pinchDist = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) + 
          Math.pow(thumbTip.y - indexTip.y, 2)
        );
        const isPinching = pinchDist < 0.05;

        // 3. Hand Position
        const handPos = { x: 1 - landmarks[9].x, y: landmarks[9].y }; 

        gestureData = {
          isFist,
          isOpenPalm,
          isPinching,
          handPosition: handPos,
          rotation: landmarks[0].x
        };
      } else {
        gestureData = {
          isFist: false,
          isOpenPalm: false,
          isPinching: false,
          handPosition: { x: 0.5, y: 0.5 },
          rotation: 0
        };
      }

      if (onGestureUpdateRef.current) {
        onGestureUpdateRef.current(gestureData);
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
           try {
              await hands.send({ image: videoRef.current });
           } catch (e) {
              // Ignore frames sent during cleanup
           }
        }
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
        try {
           if (camera.stop) camera.stop();
        } catch (e) { console.warn(e); }
        
        try {
           if (hands.close) hands.close();
        } catch (e) { console.warn(e); }
    };
  }, []); 

  return (
    <video
      ref={videoRef}
      className="hidden"
      playsInline
    />
  );
};

export default HandManager;