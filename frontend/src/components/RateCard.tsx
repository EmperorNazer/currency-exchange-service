import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CachedIcon from '@mui/icons-material/Cached';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import type { ExchangeRateResult } from '../api/exchange';

interface RateCardProps {
  rateData: ExchangeRateResult | null;
  isLoading: boolean;
  error: string | null;
  isParamsDirty: boolean;
}

function formatRate(val: number): string {
  return val.toFixed(5);
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const RateCard: React.FC<RateCardProps> = ({
  rateData,
  isLoading,
  error,
  isParamsDirty,
}) => {
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Результат расчёта
        </Typography>

        {rateData && (
          <Chip
            size="small"
            icon={rateData.fromCache ? <CachedIcon /> : <CloudDoneIcon />}
            label={rateData.fromCache ? 'Из кеша (60 сек)' : 'Новые данные'}
            color={rateData.fromCache ? 'default' : 'success'}
            variant="outlined"
          />
        )}
      </Stack>

      <Divider sx={{ mb: 2.5 }} />

      {isParamsDirty && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Параметры изменены. Нажмите «Получить курс», чтобы пересчитать значение.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading && !rateData ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography color="text.secondary">Запрос курса с биржи...</Typography>
        </Box>
      ) : rateData ? (
        <Box sx={{ position: 'relative', opacity: isLoading ? 0.6 : 1 }}>
          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Обновление курса...
              </Typography>
            </Box>
          )}

          <Typography variant="overline" color="text.secondary">
            Итоговый курс ({rateData.symbol} • {rateData.direction === 'buy' ? 'Покупка / Bid' : 'Продажа / Ask'})
          </Typography>

          <Typography
            variant="h3"
            color="primary.main"
            sx={{ fontWeight: 700, my: 1, fontFamily: 'monospace' }}
          >
            {formatRate(rateData.finalRate)}
          </Typography>

          <Stack spacing={1.2} sx={{ mt: 3, bgcolor: '#f8fafc', p: 2, borderRadius: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Базовый курс биржи:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {formatRate(rateData.baseRate)}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Поправка в процентах:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {rateData.deviationPercentage > 0 ? `+${rateData.deviationPercentage}` : rateData.deviationPercentage}%
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Абсолютная поправка:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {rateData.deviationAbsolute > 0 ? `+${rateData.deviationAbsolute}` : rateData.deviationAbsolute}
              </Typography>
            </Stack>

            <Divider />

            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                Время получения стакана:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {formatDateTime(rateData.fetchedAt)}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Данные о курсе пока не загружены. Нажмите «Получить курс».
          </Typography>
        </Box>
      )}
    </Paper>
  );
};