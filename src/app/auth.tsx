import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconArrowLeft, IconCheck, IconEye, IconEyeOff } from '@/components/icons';
import { LadderMark } from '@/components/logo';
import { Tappable } from '@/components/tappable';
import { Button, Card, Divider, Eyebrow, Row, Stack, Text } from '@/components/ui';
import { restoreFromAccount } from '@/data/sync';
import { db } from '@/db';
import { useRefreshAppState } from '@/hooks/use-app-state';
import { successHaptic } from '@/lib/haptics';
import {
  getRememberMe,
  setRememberMe,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/supabase';
import { MAX_CONTENT_WIDTH, radius, space, useTheme } from '@/theme';
import { useMotion } from '@/theme/motion-prefs';

type Mode = 'signin' | 'signup';
type Phase = 'form' | 'syncing' | 'confirm';

/**
 * Sign in / create account.
 *
 * Email and password, because the alternatives fail in Expo Go: magic links
 * and OAuth both need a deep link back into the app, and password reset via
 * emailed link lands on a web URL this project has not configured. Password
 * auth is fully self-contained.
 *
 * The screen never blocks the app. Local-first stays true: everything works
 * signed out, and signing in immediately pushes whatever this phone has
 * already earned, so an account created after a month of practice inherits
 * the month.
 */
export default function AuthScreen() {
  const theme = useTheme();
  const motion = useMotion();
  const insets = useSafeAreaInsets();
  const refresh = useRefreshAppState();

  const [mode, setMode] = useState<Mode>('signin');
  const [phase, setPhase] = useState<Phase>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(getRememberMe());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /.+@.+\..+/.test(email.trim());
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !busy;

  /** From the confirm screen: the credentials are still in state, so one tap
   *  finishes the whole journey instead of bouncing through the form again. */
  const confirmAndSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signInWithPassword(email, password);
    if (result.error) {
      setError(
        result.error.includes('confirmed')
          ? 'Not confirmed yet. Tap the link in the email first, then try again.'
          : result.error
      );
      setBusy(false);
      return;
    }
    setPhase('syncing');
    successHaptic();
    await restoreFromAccount(db);
    refresh();
    setBusy(false);
    router.back();
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);

    // The choice must be applied before the token is issued, because it decides
    // where that token gets written.
    await setRememberMe(remember);

    const result =
      mode === 'signup'
        ? await signUpWithPassword(email, password, fullName)
        : await signInWithPassword(email, password);

    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }

    if (result.needsConfirmation) {
      setPhase('confirm');
      setBusy(false);
      return;
    }

    // Signed in. Push this phone's history to the account before closing, so
    // "tied to you" is true the moment the screen dismisses.
    setPhase('syncing');
    successHaptic();
    await restoreFromAccount(db);
    refresh();
    setBusy(false);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <Tappable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          height={36}
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: theme.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <IconArrowLeft color={theme.text} size={19} />
        </Tappable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: space.lg,
            paddingBottom: insets.bottom + space.xxxl,
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: 'center',
            width: '100%',
            gap: space.lg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(motion.slow)}>
            <Stack gap={space.sm} style={{ alignItems: 'center' }}>
              <LadderMark size={44} color={theme.accent} topColor={theme.accent} />
              <Text variant="title" center>
                Your ladder, on every phone
              </Text>
              <Text variant="small" tone="textMuted" center>
                An account backs up your XP, streak and history, and carries them to a new
                device. Everything keeps working without one.
              </Text>
            </Stack>
          </Animated.View>

          {phase === 'confirm' ? (
            <Animated.View entering={FadeIn.duration(motion.slow)}>
              <Card accent={theme.positive}>
                <Stack gap={space.sm}>
                  <Eyebrow tone="positive">One step left</Eyebrow>
                  <Text variant="heading">Confirm your email</Text>
                  <Text variant="small" tone="textMuted">
                    We sent a confirmation link to {email.trim()}. Tap it, then come back
                    here.
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.warningSoft,
                      borderRadius: radius.md,
                      padding: space.md,
                    }}>
                    <Text variant="caption" tone="textMuted">
                      The link may open a browser page that fails to load. That is fine and
                      expected: your email is confirmed the moment the link is tapped, before
                      that page even tries to open.
                    </Text>
                  </View>
                  <Button
                    title={busy ? 'Signing in' : 'I tapped the link, sign me in'}
                    size="lg"
                    full
                    disabled={busy}
                    onPress={confirmAndSignIn}
                  />
                  {error ? (
                    <Text variant="small" tone="negative">
                      {error}
                    </Text>
                  ) : null}
                  <Button
                    title="Back"
                    kind="ghost"
                    full
                    onPress={() => {
                      setMode('signin');
                      setPhase('form');
                      setError(null);
                    }}
                  />
                </Stack>
              </Card>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(motion.slow).delay(60 * motion.stagger)}>
              <Card>
                <Stack gap={space.lg}>
                  {/* Mode switch */}
                  <Row gap={space.xs}>
                    {(
                      [
                        ['signin', 'Sign in'],
                        ['signup', 'Create account'],
                      ] as [Mode, string][]
                    ).map(([value, label]) => {
                      const active = mode === value;
                      return (
                        <Tappable
                          key={value}
                          onPress={() => {
                            setMode(value);
                            setError(null);
                          }}
                          accessibilityLabel={label}
                          style={{
                            flex: 1,
                            paddingVertical: space.md,
                            borderRadius: radius.md,
                            borderWidth: 1.5,
                            borderColor: active ? theme.accent : theme.border,
                            backgroundColor: active ? theme.accentSoft : 'transparent',
                            alignItems: 'center',
                          }}>
                          <Text variant="smallStrong" tone={active ? 'accent' : 'textMuted'}>
                            {label}
                          </Text>
                        </Tappable>
                      );
                    })}
                  </Row>

                  {mode === 'signup' ? (
                    <Stack gap={space.xs}>
                      <Text variant="smallStrong">Your name</Text>
                      <TextInput
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="How the app should greet you"
                        placeholderTextColor={theme.textFaint}
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        style={{
                          fontSize: 16.5,
                          color: theme.text,
                          backgroundColor: theme.elevated,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: theme.border,
                          paddingHorizontal: space.lg,
                          paddingVertical: space.md + 2,
                        }}
                      />
                    </Stack>
                  ) : null}

                  {/* Email */}
                  <Stack gap={space.xs}>
                    <Text variant="smallStrong">Email</Text>
                    <TextInput
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);
                        setError(null);
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor={theme.textFaint}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      style={{
                        fontSize: 16.5,
                        color: theme.text,
                        backgroundColor: theme.elevated,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: theme.border,
                        paddingHorizontal: space.lg,
                        paddingVertical: space.md + 2,
                      }}
                    />
                  </Stack>

                  {/* Password */}
                  <Stack gap={space.xs}>
                    <Text variant="smallStrong">Password</Text>
                    <View>
                      <TextInput
                        value={password}
                        onChangeText={(value) => {
                          setPassword(value);
                          setError(null);
                        }}
                        placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                        placeholderTextColor={theme.textFaint}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                        onSubmitEditing={submit}
                        returnKeyType="go"
                        style={{
                          fontSize: 16.5,
                          color: theme.text,
                          backgroundColor: theme.elevated,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: theme.border,
                          paddingHorizontal: space.lg,
                          paddingVertical: space.md + 2,
                          paddingRight: 52,
                        }}
                      />
                      <Tappable
                        onPress={() => setShowPassword((v) => !v)}
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        height={32}
                        style={{
                          position: 'absolute',
                          right: space.md,
                          top: 0,
                          bottom: 0,
                          justifyContent: 'center',
                        }}>
                        {showPassword ? (
                          <IconEyeOff color={theme.textMuted} size={19} />
                        ) : (
                          <IconEye color={theme.textMuted} size={19} />
                        )}
                      </Tappable>
                    </View>
                  </Stack>

                  {/* Remember me */}
                  <Row justify="space-between" align="center">
                    <Stack gap={2} style={{ flex: 1, paddingRight: space.lg }}>
                      <Text variant="smallStrong">Remember me</Text>
                      <Text variant="caption" tone="textFaint">
                        {remember
                          ? 'Stay signed in on this phone.'
                          : 'You will be signed out when the app closes.'}
                      </Text>
                    </Stack>
                    <Switch
                      value={remember}
                      onValueChange={setRemember}
                      trackColor={{ true: theme.accent, false: theme.borderStrong }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel="Remember me"
                    />
                  </Row>

                  {error ? (
                    <Animated.View entering={FadeIn.duration(motion.base)}>
                      <View
                        style={{
                          backgroundColor: theme.negativeSoft,
                          borderRadius: radius.md,
                          padding: space.md,
                        }}>
                        <Text variant="small" tone="negative">
                          {error}
                        </Text>
                      </View>
                    </Animated.View>
                  ) : null}

                  <Button
                    title={
                      phase === 'syncing'
                        ? 'Bringing your progress over'
                        : busy
                          ? mode === 'signup'
                            ? 'Creating account'
                            : 'Signing in'
                          : mode === 'signup'
                            ? 'Create account'
                            : 'Sign in'
                    }
                    size="lg"
                    full
                    disabled={!canSubmit}
                    onPress={submit}
                  />

                  {mode === 'signup' ? (
                    <Text variant="caption" tone="textFaint" center>
                      Everything this phone has already earned moves to your account the
                      moment you sign in.
                    </Text>
                  ) : null}
                </Stack>
              </Card>
            </Animated.View>
          )}

          <Divider />
          <Row gap={space.sm} align="flex-start">
            <IconCheck color={theme.positive} size={15} />
            <Text variant="caption" tone="textFaint" style={{ flex: 1 }}>
              Your answers stay on this phone either way. An account only adds a copy in the
              cloud, tied to you instead of the device.
            </Text>
          </Row>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
