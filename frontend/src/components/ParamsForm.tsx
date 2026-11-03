import React, { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { CalculationParams } from '../api/settings';

interface ParamsFormProps {
  initialParams: CalculationParams;
  onCalculate: (params: CalculationParams) => void;
  onSaveSettings: (params: CalculationParams) => Promise<void>;
  onDirtyChange: (isDirty: boolean) => void;
  isCalculating: boolean;
  isSaving: boolean;
  saveSuccessMessage: string | null;
  saveErrorMessage: string | null;
  onCloseSaveFeedback: () => void;
}

const validationSchema = Yup.object({
  source: Yup.string().oneOf(['rapira']).required('Выберите источник'),
  asset: Yup.string().trim().required('Укажите базовую валюту (например, USDT)'),
  fiat: Yup.string().trim().required('Укажите котируемую валюту (например, RUB)'),
  direction: Yup.string().oneOf(['buy', 'sell']).required('Выберите направление'),
  amount: Yup.number()
    .nullable()
    .transform((val, orig) => (orig === '' || orig === null ? null : val))
    .moreThan(0, 'Объём должен быть строго больше 0'),
  skipOrders: Yup.number()
    .integer('Должно быть целым числом')
    .min(0, 'Не может быть отрицательным')
    .required('Укажите количество пропускаемых заявок (0 или больше)'),
  takeOrders: Yup.number()
    .nullable()
    .transform((val, orig) => (orig === '' || orig === null ? null : val))
    .integer('Должно быть целым числом')
    .min(1, 'Должно быть не меньше 1'),
  arithmetic: Yup.boolean().required(),
  deviationPercentage: Yup.number()
    .typeError('Введите число')
    .required('Укажите процентную поправку (0, если не нужна)'),
  deviationAbsolute: Yup.number()
    .typeError('Введите число')
    .required('Укажите абсолютную поправку (0, если не нужна)'),
});

export const ParamsForm: React.FC<ParamsFormProps> = ({
  initialParams,
  onCalculate,
  onSaveSettings,
  onDirtyChange,
  isCalculating,
  isSaving,
  saveSuccessMessage,
  saveErrorMessage,
  onCloseSaveFeedback,
}) => {
  const [lastCalculatedSnapshot, setLastCalculatedSnapshot] = React.useState<string>(() =>
    JSON.stringify(initialParams),
  );

  const normalizeValues = (values: typeof formik.values): CalculationParams => ({
    source: values.source,
    asset: values.asset.trim().toUpperCase(),
    fiat: values.fiat.trim().toUpperCase(),
    direction: values.direction,
    amount:
      values.amount === '' || values.amount === null || values.amount === undefined
        ? null
        : Number(values.amount),
    skipOrders: Number(values.skipOrders),
    takeOrders:
      values.takeOrders === '' || values.takeOrders === null || values.takeOrders === undefined
        ? null
        : Number(values.takeOrders),
    arithmetic: Boolean(values.arithmetic),
    deviationPercentage: Number(values.deviationPercentage),
    deviationAbsolute: Number(values.deviationAbsolute),
  });

  const formik = useFormik({
    initialValues: {
      source: initialParams.source,
      asset: initialParams.asset,
      fiat: initialParams.fiat,
      direction: initialParams.direction,
      amount: initialParams.amount ?? ('' as number | ''),
      skipOrders: initialParams.skipOrders ?? 0,
      takeOrders: initialParams.takeOrders ?? ('' as number | ''),
      arithmetic: initialParams.arithmetic ?? false,
      deviationPercentage: initialParams.deviationPercentage ?? 0,
      deviationAbsolute: initialParams.deviationAbsolute ?? 0,
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: (values) => {
      const normalized = normalizeValues(values);
      setLastCalculatedSnapshot(JSON.stringify(normalized));
      onDirtyChange(false);
      onCalculate(normalized);
    },
  });

  // Отслеживаем, изменились ли параметры относительно последнего расчёта
  useEffect(() => {
    try {
      const currentNormalized = JSON.stringify(normalizeValues(formik.values));
      onDirtyChange(currentNormalized !== lastCalculatedSnapshot);
    } catch {
      onDirtyChange(true);
    }
  }, [formik.values, lastCalculatedSnapshot, onDirtyChange]);

  const handleSaveClick = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched({
        asset: true,
        fiat: true,
        amount: true,
        skipOrders: true,
        takeOrders: true,
        deviationPercentage: true,
        deviationAbsolute: true,
      });
      return;
    }
    const normalized = normalizeValues(formik.values);
    await onSaveSettings(normalized);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Параметры расчёта курса
      </Typography>
      <Divider sx={{ mb: 2.5 }} />

      {saveErrorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onCloseSaveFeedback}>
          {saveErrorMessage}
        </Alert>
      )}

      <Box component="form" onSubmit={formik.handleSubmit} noValidate>
        <Stack spacing={2.2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="source-label">Источник</InputLabel>
              <Select
                labelId="source-label"
                id="source"
                name="source"
                label="Источник"
                value={formik.values.source}
                onChange={formik.handleChange}
              >
                <MenuItem value="rapira">Rapira (Биржа)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="direction-label">Направление</InputLabel>
              <Select
                labelId="direction-label"
                id="direction"
                name="direction"
                label="Направление"
                value={formik.values.direction}
                onChange={formik.handleChange}
              >
                <MenuItem value="buy">buy (Покупка — стакан Bid)</MenuItem>
                <MenuItem value="sell">sell (Продажа — стакан Ask)</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              size="small"
              id="asset"
              name="asset"
              label="Базовая валюта (asset)"
              value={formik.values.asset}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.asset && Boolean(formik.errors.asset)}
              helperText={formik.touched.asset && formik.errors.asset}
            />

            <TextField
              fullWidth
              size="small"
              id="fiat"
              name="fiat"
              label="Котируемая валюта (fiat)"
              value={formik.values.fiat}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.fiat && Boolean(formik.errors.fiat)}
              helperText={formik.touched.fiat && formik.errors.fiat}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              id="amount"
              name="amount"
              label="Целевой объём (amount)"
              placeholder="Пусто = порог 10 000"
              value={formik.values.amount}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.amount && Boolean(formik.errors.amount)}
              helperText={
                (formik.touched.amount && formik.errors.amount) ||
                'Необязательно (число > 0)'
              }
            />

            <TextField
              fullWidth
              size="small"
              type="number"
              id="skipOrders"
              name="skipOrders"
              label="Пропустить заявок (skipOrders)"
              value={formik.values.skipOrders}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.skipOrders && Boolean(formik.errors.skipOrders)}
              helperText={formik.touched.skipOrders && formik.errors.skipOrders}
            />

            <TextField
              fullWidth
              size="small"
              type="number"
              id="takeOrders"
              name="takeOrders"
              label="Взять заявок (takeOrders)"
              placeholder="Без лимита"
              value={formik.values.takeOrders}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.takeOrders && Boolean(formik.errors.takeOrders)}
              helperText={
                (formik.touched.takeOrders && formik.errors.takeOrders) ||
                'Необязательно (целое >= 1)'
              }
            />
          </Stack>

          <FormControlLabel
            control={
              <Switch
                id="arithmetic"
                name="arithmetic"
                checked={formik.values.arithmetic}
                onChange={formik.handleChange}
              />
            }
            label="Среднее арифметическое цен (иначе — средневзвешенное по объёму)"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              id="deviationPercentage"
              name="deviationPercentage"
              label="Поправка в процентах (%)"
              value={formik.values.deviationPercentage}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={
                formik.touched.deviationPercentage &&
                Boolean(formik.errors.deviationPercentage)
              }
              helperText={
                (formik.touched.deviationPercentage &&
                  formik.errors.deviationPercentage) ||
                'Может быть отрицательной (например, -1.5)'
              }
            />

            <TextField
              fullWidth
              size="small"
              type="number"
              id="deviationAbsolute"
              name="deviationAbsolute"
              label="Абсолютная поправка"
              value={formik.values.deviationAbsolute}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={
                formik.touched.deviationAbsolute &&
                Boolean(formik.errors.deviationAbsolute)
              }
              helperText={
                (formik.touched.deviationAbsolute && formik.errors.deviationAbsolute) ||
                'Прибавляется после процентной'
              }
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              disabled={isCalculating}
              fullWidth
            >
              {isCalculating ? 'Расчёт...' : 'Получить курс'}
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="large"
              startIcon={<SaveIcon />}
              disabled={isSaving}
              onClick={handleSaveClick}
              fullWidth
            >
              {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Snackbar
        open={Boolean(saveSuccessMessage)}
        autoHideDuration={3000}
        onClose={onCloseSaveFeedback}
        message={saveSuccessMessage}
      />
    </Paper>
  );
};