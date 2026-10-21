// // import { createBrowserRouter } from 'react-router-dom';
// // import { AppLayout } from '../layouts/AppLayout';
// // import { OverviewPage } from '../pages/OverviewPage';
// // import { AqiPredictionPage } from '../pages/AqiPredictionPage';
// // import { AirQualityClassificationPage } from '../pages/AirQualityClassificationPage';
// // import { PollutionTrendsPage } from '../pages/PollutionTrendsPage';
// // import { PollutionRiskPage } from '../pages/PollutionRiskPage';
// // import { AnalyticsPage } from '../pages/AnalyticsPage';
// // import { ModelPerformancePage } from '../pages/ModelPerformancePage';
// // import { HistoricalDataPage } from '../pages/HistoricalDataPage';
// // import { AboutPage } from '../pages/AboutPage';
// // import { NotFoundPage } from '../pages/NotFoundPage';

// // export const router = createBrowserRouter([
// //   {
// //     path: '/',
// //     element: <AppLayout />,
// //     children: [
// //       { index: true, element: <OverviewPage /> },
// //       { path: 'prediction', element: <AqiPredictionPage /> },
// //       { path: 'classification', element: <AirQualityClassificationPage /> },
// //       { path: 'trends', element: <PollutionTrendsPage /> },
// //       { path: 'risk', element: <PollutionRiskPage /> },
// //       { path: 'analytics', element: <AnalyticsPage /> },
// //       { path: 'models', element: <ModelPerformancePage /> },
// //       { path: 'history', element: <HistoricalDataPage /> },
// //       { path: 'about', element: <AboutPage /> },
// //       { path: '*', element: <NotFoundPage /> },
// //     ],
// //   },
// // ]);
// import { createBrowserRouter } from 'react-router-dom';
// import { AppLayout } from '../layouts/AppLayout';
// import { OverviewPage } from '../pages/OverviewPage';
// import { AqiPredictionPage } from '../pages/AqiPredictionPage';
// import { AirQualityClassificationPage } from '../pages/AirQualityClassificationPage';
// import { PollutionTrendsPage } from '../pages/PollutionTrendsPage';
// import { PollutionRiskPage } from '../pages/PollutionRiskPage';
// import { AnalyticsPage } from '../pages/AnalyticsPage';
// import { ModelPerformancePage } from '../pages/ModelPerformancePage';
// import { HistoricalDataPage } from '../pages/HistoricalDataPage';
// // import { LiveObservationsPage } from '../pages/LiveObservationsPage';
// import { AboutPage } from '../pages/AboutPage';
// import { NotFoundPage } from '../pages/NotFoundPage';
// import LiveObservationsPage from '@/pages/LiveObservationsPage';

// export const router = createBrowserRouter([
//   {
//     path: '/',
//     element: <AppLayout />,
//     children: [
//       { index: true, element: <OverviewPage /> },
//       { path: 'prediction', element: <AqiPredictionPage /> },
//       { path: 'classification', element: <AirQualityClassificationPage /> },
//       { path: 'trends', element: <PollutionTrendsPage /> },
//       { path: 'risk', element: <PollutionRiskPage /> },
//       { path: 'analytics', element: <AnalyticsPage /> },
//       { path: 'models', element: <ModelPerformancePage /> },
//       { path: 'history', element: <HistoricalDataPage /> },
//       { path: 'live-observations', element: <LiveObservationsPage /> },
//       { path: 'about', element: <AboutPage /> },
//       { path: '*', element: <NotFoundPage /> },
//     ],
//   },
// ]);

import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { OverviewPage } from '../pages/OverviewPage';
import { AqiPredictionPage } from '../pages/AqiPredictionPage';
import { AirQualityClassificationPage } from '../pages/AirQualityClassificationPage';
import { PollutionTrendsPage } from '../pages/PollutionTrendsPage';
import { PollutionRiskPage } from '../pages/PollutionRiskPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { ModelPerformancePage } from '../pages/ModelPerformancePage';
import { HistoricalDataPage } from '../pages/HistoricalDataPage';
import { LiveObservationsPage } from '../pages/LiveObservationsPage';
import { AboutPage } from '../pages/AboutPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'prediction', element: <AqiPredictionPage /> },
      { path: 'classification', element: <AirQualityClassificationPage /> },
      { path: 'trends', element: <PollutionTrendsPage /> },
      { path: 'risk', element: <PollutionRiskPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'models', element: <ModelPerformancePage /> },
      { path: 'history', element: <HistoricalDataPage /> },
      { path: 'live-observations', element: <LiveObservationsPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
