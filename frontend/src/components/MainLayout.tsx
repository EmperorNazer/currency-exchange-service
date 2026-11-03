import React from 'react';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import { useAuth } from '../context/AuthContext';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { email, logout } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 6 }}>
      <AppBar position="static" color="default" elevation={1} sx={{ bgcolor: '#fff' }}>
        <Toolbar>
          <CurrencyExchangeIcon color="primary" sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Расчёт курсов валют
          </Typography>
          {email && (
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              {email}
            </Typography>
          )}
          <Button
            color="inherit"
            variant="outlined"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={logout}
          >
            Выйти
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {children}
      </Container>
    </Box>
  );
};