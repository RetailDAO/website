import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { currentTheme, setTheme } = useTheme();

  const themeOptions = [
    { id: 'bloomberg', value: 'bloomberg', label: 'Trad' },
    { id: 'accessible', value: 'accessible', label: 'Cont' },
    { id: 'retro', value: 'retro', label: 'Retro' }
  ];

  const handleThemeChange = (themeName) => {
    setTheme(themeName);
  };

  return (
    <div className="radio-input">
      <style jsx>{`
        .radio-input {
          display: flex;
          align-items: center;
          gap: 3px;
          background-color: black;
          padding: 3px;
          border-radius: 10px;
          overflow: hidden;
          height: 20px;
        }

        @media (min-width: 768px) {
          .radio-input {
            gap: 4px;
            padding: 4px;
            height: 45px;
          }
        }

        .radio-input input {
          display: none;
        }

        .radio-input .label {
          width: 35px;
          height: 28px;
          background-color: #0f0f0f;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 6px 1px;
          border-top: 1px solid #1a1a1a;
          transition: all 0.1s linear;
          position: relative;
          z-index: 2;
          cursor: pointer;
        }

        @media (min-width: 768px) {
          .radio-input .label {
            width: 55px;
            height: 38px;
            padding: 8px 2px;
          }
        }

        .label .back-side {
          position: absolute;
          top: -6px;
          left: 0px;
          background-color: #0f0f0f;
          border-radius: 3px 3px 1px 1px;
          width: 100%;
          height: 10px;
          box-shadow:
            inset 0 4px 2px 1px rgba(0, 0, 0, 0.7),
            inset 0px -4px 2px 0px rgba(40, 40, 40, 0.1);
          transform: perspective(250px) rotateX(50deg);
          z-index: 1;
          opacity: 0;
          transition: all 0.1s linear;
        }

        @media (min-width: 768px) {
          .label .back-side {
            top: -8px;
            height: 12px;
          }
        }

        .label:has(input[type="radio"]:checked) .back-side {
          opacity: 1;
        }

        .label:has(input[type="radio"]:checked) {
          transform: perspective(180px) rotateX(-18deg);
          transform-origin: 50% 40%;
          box-shadow: inset 0px -15px 12px 0px rgba(0, 0, 0, 0.7);
          border-top: 1px solid #333333;
          margin-top: 3px;
          border-radius: 0 0 3px 3px;
        }

        @media (min-width: 768px) {
          .label:has(input[type="radio"]:checked) {
            margin-top: 4px;
          }
        }

        .label .text {
          color: #434343ff;
          font-size: 8px;
          line-height: 8px;
          padding: 0px;
          font-weight: 600;
          text-transform: uppercase;
          transition: all 0.1s linear;
          text-shadow: -1px -1px 1px rgba(0, 0, 0, 0.3);
        }

        @media (min-width: 768px) {
          .label .text {
            font-size: 11px;
            line-height: 9px;
          }
        }

        .label input[type="radio"]:checked + .text {
          color: #0e006cff;
          text-shadow:
            0px 0px 6px rgba(0, 255, 26, 1),
            1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .label .bottom-line {
          width: 100%;
          height: 1px;
          border-radius: 999px;
          background-color: #0f0f0f;
          box-shadow: 0 0 2px 0px rgba(0, 0, 0, 0.8);
          border-top: 1px solid #1a1a1a;
          transition: all 0.1s linear;
        }

        .label:has(input[type="radio"]:checked) .bottom-line {
          background-color: #080808;
          border-top: 1px solid #333333;
        }
      `}</style>

      {themeOptions.map((option) => (
        <label key={option.id} className="label">
          <div className="back-side"></div>
          <input
            type="radio"
            id={option.id}
            name="theme-radio"
            value={option.value}
            checked={currentTheme === option.value}
            onChange={() => handleThemeChange(option.value)}
          />
          <span className="text">{option.label}</span>
          <span className="bottom-line"></span>
        </label>
      ))}
    </div>
  );
};

export default ThemeToggle;