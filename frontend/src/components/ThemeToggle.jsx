import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
        ${isDark ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-300 hover:bg-gray-400'}
      `}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
    >
      <span
        className={`
          inline-flex h-6 w-6 items-center justify-center transform rounded-full bg-white shadow-md transition-all duration-200 ease-in-out
          ${isDark ? 'translate-x-7' : 'translate-x-1'}
        `}
      >
        {isDark ? (
          <Moon size={14} className="text-orange-600" />
        ) : (
          <Sun size={14} className="text-yellow-500" />
        )}
      </span>
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </button>
  );
};

export default ThemeToggle;