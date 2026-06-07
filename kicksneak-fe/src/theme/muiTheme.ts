import { createTheme } from '@mui/material/styles';

export const darkMuiTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#408A71' },
        secondary: { main: '#285A48' },
        background: { default: '#091413', paper: 'rgba(40,90,72,0.15)' },
        text: { primary: '#B0E4CC', secondary: '#408A71' },
        divider: 'rgba(176,228,204,0.12)',
    },
    typography: {
        fontFamily: "'DM Sans', sans-serif",
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none', fontFamily: "'Syne', sans-serif", fontWeight: 600 } } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', backdropFilter: 'blur(16px)' } } },
        MuiChip: { styleOverrides: { root: { fontFamily: "'Syne', sans-serif" } } },
        MuiTooltip: { styleOverrides: { tooltip: { fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem' } } },
    },
});

export const lightMuiTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#7286D3' },
        secondary: { main: '#8EA7E9' },
        background: { default: '#FFF2F2', paper: 'rgba(142,167,233,0.12)' },
        text: { primary: '#3a3a5c', secondary: '#8EA7E9' },
        divider: 'rgba(114,134,211,0.2)',
    },
    typography: {
        fontFamily: "'DM Sans', sans-serif",
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none', fontFamily: "'Syne', sans-serif", fontWeight: 600 } } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', backdropFilter: 'blur(16px)' } } },
        MuiChip: { styleOverrides: { root: { fontFamily: "'Syne', sans-serif" } } },
        MuiTooltip: { styleOverrides: { tooltip: { fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem' } } },
    },
});