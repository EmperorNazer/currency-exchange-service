import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthPage } from './components/AuthPage';
import { MainLayout } from './components/MainLayout';
import { ParamsForm } from './components/ParamsForm';
import { RateCard } from './components/RateCard';
import { useAuth } from './context/AuthContext';
import { getSettingsApi, updateSettingsApi } from './api/settings';
import { calculateRateApi } from './api/exchange';
import type { ExchangeRateResult } from './api/exchange';
import { extractErrorMessage } from './api/client';

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [rateData, setRateData] = useState<ExchangeRateResult | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [isParamsDirty, setIsParamsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialRateRequested, setInitialRateRequested] = useState(false);

  // Сброс локального стейта при выходе из аккаунта
  useEffect(() => {
    if (!isAuthenticated) {
      setRateData(null);
      setRateError(null);
      setIsParamsDirty(false);
      setInitialRateRequested(false);
      queryClient.clear();
    }
  }, [isAuthenticated, queryClient]);

  // 1. Загрузка сохранённых настроек пользователя при входе
  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: getSettingsApi,
    enabled: isAuthenticated,
    retry: 1,
  });

  // 2. Мутация для расчёта курса (при ошибке сохраняет предыдущий rateData на экране)
  const calculateMutation = useMutation({
    mutationFn: calculateRateApi,
    onSuccess: (data) => {
      setRateData(data);
      setRateError(null);
    },
    onError: (err) => {
      setRateError(extractErrorMessage(err, 'Не удалось получить курс с биржи'));
    },
  });

  // 3. Автоматический первый запрос курса сразу после загрузки настроек
  useEffect(() => {
    if (settingsQuery.data && !initialRateRequested) {
      setInitialRateRequested(true);
      calculateMutation.mutate(settingsQuery.data);
    }
  }, [settingsQuery.data, initialRateRequested, calculateMutation]);

  // 4. Мутация для сохранения настроек в БД
  const saveSettingsMutation = useMutation({
    mutationFn: updateSettingsApi,
    onSuccess: (savedParams) => {
      queryClient.setQueryData(['user-settings'], savedParams);
      setSaveSuccess('Настройки успешно сохранены');
      setSaveError(null);
    },
    onError: (err) => {
      setSaveError(extractErrorMessage(err, 'Ошибка сохранения настроек'));
    },
  });

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <MainLayout>
      {settingsQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
          <CircularProgress sx={{ mr: 2 }} />
          <Typography>Загрузка ваших настроек...</Typography>
        </Box>
      ) : settingsQuery.isError || !settingsQuery.data ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="error">
            {extractErrorMessage(settingsQuery.error, 'Не удалось загрузить настройки пользователя')}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <ParamsForm
            initialParams={settingsQuery.data}
            onCalculate={(params) => calculateMutation.mutate(params)}
            onSaveSettings={async (params) => {
              await saveSettingsMutation.mutateAsync(params);
            }}
            onDirtyChange={setIsParamsDirty}
            isCalculating={calculateMutation.isPending}
            isSaving={saveSettingsMutation.isPending}
            saveSuccessMessage={saveSuccess}
            saveErrorMessage={saveError}
            onCloseSaveFeedback={() => {
              setSaveSuccess(null);
              setSaveError(null);
            }}
          />

          <RateCard
            rateData={rateData}
            isLoading={calculateMutation.isPending}
            error={rateError}
            isParamsDirty={isParamsDirty}
          />
        </Box>
      )}
    </MainLayout>
  );
};

export default App;