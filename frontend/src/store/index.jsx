/**
 * 全局状态管理
 * 使用React Context + useReducer实现简单的状态管理
 * 管理实例列表、系统状态等全局数据
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { instanceApi, systemApi } from '../services/api';

// 初始状态
const initialState = {
  // 实例相关状态
  instances: [],
  instancesLoading: false,
  instancesError: null,
  selectedInstance: null,
  
  // 系统状态
  systemStatus: {
    healthy: false,
    services: {},
    lastCheck: null
  },
  
  // UI状态
  sidebarCollapsed: false,
  
  // 用户设置
  settings: {
    autoRefresh: true,
    refreshInterval: 30000, // 30秒
    theme: 'light'
  }
};

// Action类型
const ActionTypes = {
  // 实例相关
  SET_INSTANCES_LOADING: 'SET_INSTANCES_LOADING',
  SET_INSTANCES: 'SET_INSTANCES',
  SET_INSTANCES_ERROR: 'SET_INSTANCES_ERROR',
  ADD_INSTANCE: 'ADD_INSTANCE',
  UPDATE_INSTANCE: 'UPDATE_INSTANCE',
  REMOVE_INSTANCE: 'REMOVE_INSTANCE',
  SET_SELECTED_INSTANCE: 'SET_SELECTED_INSTANCE',
  
  // 系统状态
  SET_SYSTEM_STATUS: 'SET_SYSTEM_STATUS',
  
  // UI状态
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_SIDEBAR_COLLAPSED: 'SET_SIDEBAR_COLLAPSED',
  
  // 设置
  UPDATE_SETTINGS: 'UPDATE_SETTINGS'
};

// Reducer函数
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_INSTANCES_LOADING:
      return {
        ...state,
        instancesLoading: action.payload,
        instancesError: action.payload ? null : state.instancesError
      };
      
    case ActionTypes.SET_INSTANCES:
      return {
        ...state,
        instances: action.payload,
        instancesLoading: false,
        instancesError: null
      };
      
    case ActionTypes.SET_INSTANCES_ERROR:
      return {
        ...state,
        instancesError: action.payload,
        instancesLoading: false
      };
      
    case ActionTypes.ADD_INSTANCE:
      return {
        ...state,
        instances: [...state.instances, action.payload]
      };
      
    case ActionTypes.UPDATE_INSTANCE:
      return {
        ...state,
        instances: state.instances.map(instance =>
          instance.id === action.payload.id
            ? { ...instance, ...action.payload }
            : instance
        ),
        selectedInstance: state.selectedInstance?.id === action.payload.id
          ? { ...state.selectedInstance, ...action.payload }
          : state.selectedInstance
      };
      
    case ActionTypes.REMOVE_INSTANCE:
      return {
        ...state,
        instances: state.instances.filter(instance => instance.id !== action.payload),
        selectedInstance: state.selectedInstance?.id === action.payload
          ? null
          : state.selectedInstance
      };
      
    case ActionTypes.SET_SELECTED_INSTANCE:
      return {
        ...state,
        selectedInstance: action.payload
      };
      
    case ActionTypes.SET_SYSTEM_STATUS:
      return {
        ...state,
        systemStatus: {
          ...state.systemStatus,
          ...action.payload,
          lastCheck: new Date().toISOString()
        }
      };
      
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed
      };
      
    case ActionTypes.SET_SIDEBAR_COLLAPSED:
      return {
        ...state,
        sidebarCollapsed: action.payload
      };
      
    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
      
    default:
      return state;
  }
}

// Context创建
const AppContext = createContext();

// Provider组件
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Action创建函数
  const actions = {
    // 实例相关操作
    async fetchInstances(params = {}) {
      dispatch({ type: ActionTypes.SET_INSTANCES_LOADING, payload: true });
      
      try {
        const response = await instanceApi.getInstances(params);
        
        if (response.success) {
          dispatch({ 
            type: ActionTypes.SET_INSTANCES, 
            payload: response.data.instances || [] 
          });
        } else {
          dispatch({ 
            type: ActionTypes.SET_INSTANCES_ERROR, 
            payload: response.error || '获取实例列表失败' 
          });
        }
      } catch (error) {
        dispatch({ 
          type: ActionTypes.SET_INSTANCES_ERROR, 
          payload: error.message 
        });
      }
    },

    updateInstanceStatus(instanceId, status) {
      dispatch({ 
        type: ActionTypes.UPDATE_INSTANCE, 
        payload: { id: instanceId, status } 
      });
    },

    setSelectedInstance(instance) {
      dispatch({ 
        type: ActionTypes.SET_SELECTED_INSTANCE, 
        payload: instance 
      });
    },

    // 系统状态操作
    async checkSystemStatus() {
      try {
        const response = await systemApi.getSystemStatus();
        
        if (response.success) {
          dispatch({ 
            type: ActionTypes.SET_SYSTEM_STATUS, 
            payload: response.data 
          });
        }
      } catch (error) {
        console.error('检查系统状态失败:', error);
        dispatch({ 
          type: ActionTypes.SET_SYSTEM_STATUS, 
          payload: { healthy: false, error: error.message } 
        });
      }
    },

    // UI操作
    toggleSidebar() {
      dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
    },

    setSidebarCollapsed(collapsed) {
      dispatch({ 
        type: ActionTypes.SET_SIDEBAR_COLLAPSED, 
        payload: collapsed 
      });
    },

    // 设置操作
    updateSettings(newSettings) {
      dispatch({ 
        type: ActionTypes.UPDATE_SETTINGS, 
        payload: newSettings 
      });
      
      // 保存到localStorage
      try {
        const settings = { ...state.settings, ...newSettings };
        localStorage.setItem('codestudio_settings', JSON.stringify(settings));
      } catch (error) {
        console.warn('保存设置到localStorage失败:', error);
      }
    }
  };

  // 初始化
  useEffect(() => {
    // 从localStorage加载设置
    try {
      const savedSettings = localStorage.getItem('codestudio_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: settings });
      }
    } catch (error) {
      console.warn('从localStorage加载设置失败:', error);
    }

    // 初始化数据
    actions.fetchInstances();
    actions.checkSystemStatus();
  }, []);

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook for using context
export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};

// 选择器函数
export const selectors = {
  getInstances: (state) => state.instances,
  getInstanceById: (state, id) => state.instances.find(instance => instance.id === id),
  getRunningInstances: (state) => state.instances.filter(instance => instance.status === 'running'),
  getInstancesLoading: (state) => state.instancesLoading,
  getSystemStatus: (state) => state.systemStatus,
  getSidebarCollapsed: (state) => state.sidebarCollapsed,
  getSettings: (state) => state.settings
};

export default AppContext;
