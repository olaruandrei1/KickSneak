import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouter } from './router/AppRouter';
import { initResponsiveObserver } from './services/responsiveObserver';
import { useThemeStore } from './store/themeStore';
import { darkMuiTheme, lightMuiTheme } from './theme/muiTheme';
import '../src/styles/global.css'

function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    const cleanup = initResponsiveObserver();
    return cleanup;
  }, []);

  return (
    <ThemeProvider theme={theme === 'dark' ? darkMuiTheme : lightMuiTheme}>
      <CssBaseline enableColorScheme />
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;