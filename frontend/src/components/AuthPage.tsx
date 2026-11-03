import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { loginApi, registerApi } from '../api/auth';
import { extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { loginSuccess } = useAuth();

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Введите корректный email')
      .required('Укажите email'),
    password: Yup.string()
      .min(6, 'Пароль должен содержать минимум 6 символов')
      .required('Укажите пароль'),
    confirmPassword: isRegisterMode
      ? Yup.string()
          .oneOf([Yup.ref('password')], 'Пароли не совпадают')
          .required('Повторите пароль')
      : Yup.string().notRequired(),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      try {
        const payload = {
          email: values.email.trim(),
          password: values.password,
        };
        const response = isRegisterMode
          ? await registerApi(payload)
          : await loginApi(payload);

        loginSuccess(response.accessToken, response.user.email);
      } catch (err) {
        setServerError(extractErrorMessage(err, 'Ошибка авторизации'));
      } finally {
        setSubmitting(false);
      }
    },
  });

  const toggleMode = () => {
    setServerError(null);
    setIsRegisterMode((prev) => !prev);
    formik.resetForm();
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
       <Typography variant="h5" component="h1" align="center" gutterBottom sx={{ fontWeight: 600 }}>
         Сервис курсов валют
       </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
          {isRegisterMode ? 'Регистрация нового аккаунта' : 'Вход в систему'}
        </Typography>

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={formik.handleSubmit} noValidate>
          <TextField
            fullWidth
            margin="normal"
            id="email"
            name="email"
            label="Email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            disabled={formik.isSubmitting}
          />

          <TextField
            fullWidth
            margin="normal"
            id="password"
            name="password"
            label="Пароль"
            type="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            disabled={formik.isSubmitting}
          />

          {isRegisterMode && (
            <TextField
              fullWidth
              margin="normal"
              id="confirmPassword"
              name="confirmPassword"
              label="Повторите пароль"
              type="password"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
              disabled={formik.isSubmitting}
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={formik.isSubmitting}
            sx={{ mt: 3, mb: 2 }}
          >
            {formik.isSubmitting
              ? 'Отправка...'
              : isRegisterMode
                ? 'Зарегистрироваться'
                : 'Войти'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={toggleMode}
              disabled={formik.isSubmitting}
            >
              {isRegisterMode
                ? 'Уже есть аккаунт? Войти'
                : 'Нет аккаунта? Зарегистрироваться'}
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};