import dedent from 'dedent';

export function sdkWrapperContent(): string {
	return dedent`
		import { useCallback, useEffect, useState } from 'react';
		import AppExtensionsSDK, { Color, Command, Event } from '@pipedrive/app-extensions-sdk';

		export type Surface = 'panel' | 'modal';
		type Theme = 'light' | 'dark';
		type PageState = 'visible' | 'hidden';

		export interface IframeContext {
			identifier?: string;
			query: Record<string, string>;
			data: unknown;
			tokenPresent: boolean;
		}

		function normalizeTheme(theme: unknown): Theme {
			return theme === 'dark' ? 'dark' : 'light';
		}

		function applyTheme(theme: Theme): void {
			document.documentElement.setAttribute('data-theme', theme);
		}

		function sdkErrorMessage(error: unknown): string {
			return error instanceof Error ? error.message : String(error);
		}

		function parseData(value: string | null): unknown {
			if (!value) return null;

			try {
				return JSON.parse(value);
			} catch {
				return value;
			}
		}

		export function readIframeContext(): IframeContext {
			const params = new URLSearchParams(window.location.search);
			const query = Object.fromEntries(params.entries());

			return {
				identifier: params.get('id') ?? undefined,
				query,
				data: parseData(params.get('data')),
				tokenPresent: params.has('token'),
			};
		}

		function initialSize(surface: Surface): { height: number; width?: number } {
			return surface === 'modal' ? { height: 420, width: 640 } : { height: 360 };
		}

		export function usePipedriveSdk(surface: Surface) {
			const [context] = useState<IframeContext>(() => readIframeContext());
			const [sdk, setSdk] = useState<AppExtensionsSDK | null>(null);
			const [status, setStatus] = useState('Connecting');
			const [theme, setTheme] = useState<Theme>('light');
			const [visibility, setVisibility] = useState('visible');
			const [pageState, setPageState] = useState<PageState>(
				document.visibilityState === 'hidden' ? 'hidden' : 'visible',
			);
			const [lastAction, setLastAction] = useState('None');
			const [signedTokenPreview, setSignedTokenPreview] = useState('Not requested');

			useEffect(() => {
				const stops: Array<() => void> = [];
				let cancelled = false;

				const waitingTimer = window.setTimeout(() => {
					if (!cancelled) setStatus('Waiting for Pipedrive iframe');
				}, 2500);

				async function initialize(): Promise<void> {
					try {
						if (!context.identifier) {
							window.clearTimeout(waitingTimer);
							applyTheme('light');
							setTheme('light');
							setStatus('Local preview');
							setLastAction('Open this URL from Pipedrive to use SDK actions');
							return;
						}

						const instance = new AppExtensionsSDK({ identifier: context.identifier });
						const initialTheme = normalizeTheme(instance.userSettings.theme);

						applyTheme(initialTheme);
						setTheme(initialTheme);

						const initializedSdk = await instance.initialize({ size: initialSize(surface) });
						if (cancelled) return;

						window.clearTimeout(waitingTimer);
						setSdk(initializedSdk);
						setStatus('Ready');

						stops.push(
							initializedSdk.listen(Event.USER_SETTINGS_CHANGE, ({ data }) => {
								if (!data?.theme) return;
								const nextTheme = normalizeTheme(data.theme);
								applyTheme(nextTheme);
								setTheme(nextTheme);
							}),
						);

						stops.push(
							initializedSdk.listen(Event.VISIBILITY, ({ data, error }) => {
								if (error) {
									setLastAction('Visibility event failed: ' + error);
									return;
								}

								if (data) setVisibility(data.is_visible ? 'visible' : 'hidden');
							}),
						);

						stops.push(
							initializedSdk.listen(Event.PAGE_VISIBILITY_STATE, ({ data, error }) => {
								if (error) {
									setLastAction('Page state event failed: ' + error);
									return;
								}

								if (data?.state) setPageState(data.state);
							}),
						);
					} catch (error) {
						if (!cancelled) {
							window.clearTimeout(waitingTimer);
							setStatus('SDK initialization failed');
							setLastAction(sdkErrorMessage(error));
						}
					}
				}

				void initialize();

				return () => {
					cancelled = true;
					window.clearTimeout(waitingTimer);
					for (const stop of stops) stop();
				};
			}, [context.identifier, surface]);

			const runSdkAction = useCallback(
				async <T,>(successMessage: string, action: (client: AppExtensionsSDK) => Promise<T>): Promise<T | undefined> => {
					if (!sdk) {
						setLastAction('SDK is not ready');
						return undefined;
					}

					try {
						const result = await action(sdk);
						setLastAction(successMessage);
						return result;
					} catch (error) {
						setLastAction(sdkErrorMessage(error));
						return undefined;
					}
				},
				[sdk],
			);

			const showSnackbar = useCallback(async () => {
				await runSdkAction('Snackbar sent', (client) =>
					client.execute(Command.SHOW_SNACKBAR, {
						message: 'Action completed',
						link: {
							url: 'https://app.pipedrive.com',
							label: 'Open Pipedrive',
						},
					}),
				);
			}, [runSdkAction]);

			const showConfirmation = useCallback(async () => {
				const response = await runSdkAction('Confirmation answered', (client) =>
					client.execute(Command.SHOW_CONFIRMATION, {
						title: 'Confirm action',
						description: 'This dialog is rendered by Pipedrive through the App Extensions SDK.',
						okText: 'Confirm',
						cancelText: 'Cancel',
						okColor: Color.PRIMARY,
					}),
				);

				if (response) setLastAction(response.confirmed ? 'Confirmed' : 'Cancelled');
			}, [runSdkAction]);

			const [isExpanded, setIsExpanded] = useState(false);

			const resize = useCallback(async () => {
				const nextExpanded = !isExpanded;
				const size = surface === 'modal'
					? (nextExpanded ? { height: 480, width: 720 } : { height: 420, width: 640 })
					: (nextExpanded ? { height: 420 } : { height: 360 });
				await runSdkAction(nextExpanded ? 'Expanded' : 'Collapsed', (client) =>
					client.execute(Command.RESIZE, size),
				);
				setIsExpanded(nextExpanded);
			}, [runSdkAction, surface, isExpanded]);

			const getSignedToken = useCallback(async () => {
				const response = await runSdkAction('Signed token received', (client) => client.execute(Command.GET_SIGNED_TOKEN));

				if (response) {
					setSignedTokenPreview(response.token.slice(0, 16) + '...' + response.token.length + ' chars');
				}
			}, [runSdkAction]);

			return {
				sdk,
				context,
				status,
				theme,
				visibility,
				pageState,
				lastAction,
				signedTokenPreview,
				isReady: sdk !== null,
				runSdkAction,
				actions: {
					showSnackbar,
					showConfirmation,
					resize,
					getSignedToken,
					isExpanded,
				},
			};
		}
	`;
}
