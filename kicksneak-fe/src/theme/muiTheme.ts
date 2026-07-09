import { createTheme } from '@mui/material/styles';

export const darkMuiTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#D8FF3E', contrastText: '#0B0C0E' },
        secondary: { main: '#A3C51B', contrastText: '#0B0C0E' },
        background: { default: '#0B0C0E', paper: '#141519' },
        text: { primary: '#F2F3EC', secondary: '#91968A' },
        divider: 'rgba(242,243,236,0.11)',
        success: { main: '#4ade80' },
        error: { main: '#ff6b6b' },
        warning: { main: '#fbbf24' },
        info: { main: '#60a5fa' },
    },
    typography: {
        fontFamily: "'Space Grotesk', sans-serif",
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none', fontFamily: "'Unbounded', sans-serif", fontWeight: 600 } } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', backdropFilter: 'blur(16px)' } } },
        MuiChip: { styleOverrides: { root: { fontFamily: "'Unbounded', sans-serif" } } },
        MuiTooltip: { styleOverrides: { tooltip: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.75rem' } } },
    },
});

export const lightMuiTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#566E0B', contrastText: '#FAFAF5' },
        secondary: { main: '#171A0B', contrastText: '#FAFAF5' },
        background: { default: '#FAFAF5', paper: '#FFFFFF' },
        text: { primary: '#16180F', secondary: '#6A6F5E' },
        divider: 'rgba(23,26,11,0.15)',
        success: { main: '#15803d' },
        error: { main: '#dc2626' },
        warning: { main: '#d97706' },
        info: { main: '#2563eb' },
    },
    typography: {
        fontFamily: "'Space Grotesk', sans-serif",
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none', fontFamily: "'Unbounded', sans-serif", fontWeight: 600 } } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', backdropFilter: 'blur(16px)' } } },
        MuiChip: { styleOverrides: { root: { fontFamily: "'Unbounded', sans-serif" } } },
        MuiTooltip: { styleOverrides: { tooltip: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.75rem' } } },
    },
});