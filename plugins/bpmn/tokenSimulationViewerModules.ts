import tokenSimulationViewer from 'bpmn-js-token-simulation/lib/viewer'

export const silencedNotificationsModule = { notifications: ['value', { showNotification: () => {} }] }

export const tokenSimulationViewerModules = [tokenSimulationViewer, silencedNotificationsModule]
