import { useCallback, useMemo } from 'react';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useTheme } from '../context/ThemeContext';

const StarryBackground = () => {
  const { isDark } = useTheme();

  const particlesInit = useCallback(async engine => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (_container) => {
    // Optional callback when particles are loaded
  }, []);

  const options = useMemo(() => {
    return {
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
            area: 1000,
          },
          value: 60,
        },
        opacity: {
          value: isDark ? 0.8 : 0.4,
          random: {
            enable: true,
            minimumValue: 0.1,
          },
          animation: {
            enable: true,
            speed: 1,
            minimumValue: 0.1,
            sync: false,
          },
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: { min: 0.5, max: 2 },
          random: {
            enable: true,
            minimumValue: 0.5,
          },
          animation: {
            enable: true,
            speed: 2,
            minimumValue: 0.5,
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
  }, [isDark]);

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={options}
        className="w-full h-full"
      />
    </div>
  );
};

export default StarryBackground;