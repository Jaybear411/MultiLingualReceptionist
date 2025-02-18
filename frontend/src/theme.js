import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2C2C2C', // Sophisticated black
      light: '#3E3E3E',
      dark: '#1A1A1A',
    },
    secondary: {
      main: '#D4C8BE', // Elegant beige
      light: '#E5DCD4',
      dark: '#B8A99D',
    },
    background: {
      default: '#FAF7F5', // Light beige background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C2C2C',
      secondary: '#5C5C5C',
    },
  },
  typography: {
    fontFamily: '"Marcellus", "Playfair Display", serif',
    h1: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 500,
    },
    h4: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 500,
    },
    h5: {
      fontFamily: '"Marcellus", serif',
      fontWeight: 400,
    },
    h6: {
      fontFamily: '"Marcellus", serif',
      fontWeight: 400,
    },
    button: {
      fontFamily: '"Marcellus", serif',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          padding: '10px 24px',
          fontSize: '1rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
