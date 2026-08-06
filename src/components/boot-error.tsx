import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, Text as RNText, View } from 'react-native';

/**
 * Last-resort error surface.
 *
 * Deliberately built from bare React Native primitives with hard-coded colors:
 * if the theme, the database or a content module is what broke, anything that
 * imports them cannot be trusted to render. A readable stack beats a white
 * screen, which is invisible in production and impossible to report.
 */
export function BootError({ title, error }: { title: string; error: Error | string }) {
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? '' : (error.stack ?? '');

  return (
    <View style={{ flex: 1, backgroundColor: '#FBFAF6', paddingTop: 72 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        <RNText style={{ fontSize: 22, fontWeight: '700', color: '#A83232' }}>{title}</RNText>
        <RNText style={{ fontSize: 15, lineHeight: 22, color: '#22262B' }}>{message}</RNText>
        {stack ? (
          <RNText style={{ fontSize: 11, lineHeight: 16, color: '#5D646C' }}>
            {stack.split('\n').slice(0, 14).join('\n')}
          </RNText>
        ) : null}
        <RNText style={{ fontSize: 13, lineHeight: 20, color: '#5D646C', marginTop: 12 }}>
          Screenshot this and send it over. Closing and reopening the app is safe, nothing you
          have finished is lost, because progress is written locally as you go.
        </RNText>
      </ScrollView>
    </View>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-phase errors anywhere below it.
 *
 * It cannot catch a throw during module evaluation. That happens before React
 * exists. Which is why the risky module-scope calls are individually guarded
 * as well. This is the second net, not the only one.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AI Ladder] render error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <BootError title="Something broke while rendering" error={this.state.error} />;
    }
    return this.props.children;
  }
}
