import { useCallback, useMemo, useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useTheme } from '../context/ThemeContext';

const StarryBackground = () => {
  const { isDark } = useTheme();
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    console.log('🌟 Initializing TSParticles engine...');
    initParticlesEngine(async (engine) => {
      try {
        // Load the slim version for better performance
        await loadSlim(engine);
        console.log('✅ TSParticles engine loaded successfully');
        console.log('🔧 Engine details:', engine);
        return engine;
      } catch (error) {
        console.error('❌ TSParticles engine failed to load:', error);
        throw error;
      }
    }).then(() => {
      console.log('🎯 TSParticles engine initialization complete');
      setEngineReady(true);
    }).catch((error) => {
      console.error('❌ TSParticles engine initialization failed:', error);
      setEngineReady(false);
    });
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    console.log('🎯 TSParticles container loaded:', container);
  }, []);

  const options = useMemo(() => {
    console.log('🎨 Generating particle options, isDark:', isDark);
    const config = {
      background: {
        color: {
          value: 'transparent',
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: {
            enable: false,
          },
          onHover: {
            enable: true,
            mode: 'repulse',
          },
          resize: true,
        },
        modes: {
          repulse: {
            distance: 100,
            duration: 0.4,
          },
        },
      },
      particles: {
        color: {
          value: isDark ? '#ffffff' : '#374151',
        },
        links: {
          color: isDark ? '#ffffff' : '#6b7280',
          distance: 150,
          enable: false, // Start with no connections for cleaner look
          opacity: 0.1,
          width: 1,
        },
        move: {
          direction: 'none',
          enable: true,
          outModes: {
            default: 'bounce',
          },
          random: true,
          speed: 0.5,
          straight: false,
        },
        number: {
          density: {
            enable: true,
            area: 800,
          },
          value: 80,
        },
        opacity: {
          value: isDark ? 0.9 : 0.6,
          random: {
            enable: true,
            minimumValue: 0.2,
          },
          animation: {
            enable: true,
            speed: 1,
            minimumValue: 0.2,
            sync: false,
          },
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: { min: 1, max: 3 },
          random: {
            enable: true,
            minimumValue: 1,
          },
          animation: {
            enable: true,
            speed: 2,
            minimumValue: 1,
            sync: false,
          },
        },
      },
      detectRetina: true,
      responsive: [
        {
          maxWidth: 768,
          options: {
            particles: {
              number: {
                value: 30,
              },
              move: {
                speed: 0.3,
              },
            },
          },
        },
      ],
    };
    console.log('🔧 Final particle config:', config);
    return config;
  }, [isDark]);

  return (
    <div 
      id="tsparticles-background"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    >
      {console.log('🖼️ Rendering TSParticles component, engineReady:', engineReady)}
      {engineReady && (
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          options={options}
          className="w-full h-full"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1
          }}
        />
      )}
    </div>
  );
};

export default StarryBackground;