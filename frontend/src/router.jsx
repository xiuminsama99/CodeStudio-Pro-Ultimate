import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InstanceList from './pages/InstanceList';
import InstanceDetail from './pages/InstanceDetail';
import CreateInstance from './pages/CreateInstance';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

/**
 * 路由配置
 * 使用React Router v6的createBrowserRouter API
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'instances',
        element: <InstanceList />,
      },
      {
        path: 'instances/:id',
        element: <InstanceDetail />,
      },
      {
        path: 'create',
        element: <CreateInstance />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  }
]);

export default router;
