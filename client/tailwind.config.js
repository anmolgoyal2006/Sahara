export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          primary: '#1D9E75',
          dark: '#0F6E56',
          light: '#F0FBF7',
          border: '#9FE1CB',
          pale: '#E1F5EE',
        },
        blue: {
          primary: '#185FA5',
          light: '#EBF4FF',
          border: '#DDE8F5',
          pale: '#F7FBFF',
        },
        sahara: {
          bg: '#EBF4FF',
          text: '#0A2540',
          muted: '#5A7A9A',
          hint: '#A0B8D0',
          border: '#DDE8F5',
        }
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   '10px',
        'sm':   '12px',
        'base': '14px',
        'lg':   '16px',
        'xl':   '18px',
        '2xl':  '20px',
        '3xl':  '24px',
        '4xl':  '28px',
        '5xl':  '34px',
      }
    },
  },
  plugins: [],
}
