/**
 * API客户端
 * 封装所有后端API调用，提供统一的错误处理和数据格式化
 */

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_TIMEOUT = 10000; // 10秒超时

/**
 * HTTP请求封装
 */
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
  }

  /**
   * 发送HTTP请求
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      ...otherOptions
    } = options;

    // 构建完整URL
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    // 默认请求头
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    };

    // 构建请求配置
    const config = {
      method,
      headers: defaultHeaders,
      ...otherOptions
    };

    // 添加请求体
    if (body && method !== 'GET') {
      config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      config.signal = controller.signal;

      const response = await fetch(fullUrl, config);
      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 解析响应数据
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get(url, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this.request(fullUrl, { method: 'GET', ...options });
  }

  /**
   * POST请求
   */
  async post(url, data = {}, options = {}) {
    return this.request(url, { method: 'POST', body: data, ...options });
  }

  /**
   * PUT请求
   */
  async put(url, data = {}, options = {}) {
    return this.request(url, { method: 'PUT', body: data, ...options });
  }

  /**
   * DELETE请求
   */
  async delete(url, options = {}) {
    return this.request(url, { method: 'DELETE', ...options });
  }
}

// 创建API客户端实例
const apiClient = new ApiClient();

/**
 * 实例管理API
 */
export const instanceApi = {
  /**
   * 获取实例列表
   */
  async getInstances(params = {}) {
    try {
      const response = await apiClient.get('/api/instances', params);
      return {
        success: true,
        data: response.data || response,
        message: '获取实例列表成功'
      };
    } catch (error) {
      console.error('获取实例列表失败:', error);
      return {
        success: false,
        error: error.message,
        message: '获取实例列表失败'
      };
    }
  },

  /**
   * 获取实例详情
   */
  async getInstance(instanceId) {
    try {
      const response = await apiClient.get(`/api/instances/${instanceId}`);
      return {
        success: true,
        data: response.data || response,
        message: '获取实例详情成功'
      };
    } catch (error) {
      console.error('获取实例详情失败:', error);
      return {
        success: false,
        error: error.message,
        message: '获取实例详情失败'
      };
    }
  },

  /**
   * 创建实例
   */
  async createInstance(config) {
    try {
      const response = await apiClient.post('/api/instances', config);
      return {
        success: true,
        data: response.data || response,
        message: '创建实例成功'
      };
    } catch (error) {
      console.error('创建实例失败:', error);
      return {
        success: false,
        error: error.message,
        message: '创建实例失败'
      };
    }
  },

  /**
   * 启动实例
   */
  async startInstance(instanceId) {
    try {
      const response = await apiClient.post(`/api/instances/${instanceId}/start`);
      return {
        success: true,
        data: response.data || response,
        message: '启动实例成功'
      };
    } catch (error) {
      console.error('启动实例失败:', error);
      return {
        success: false,
        error: error.message,
        message: '启动实例失败'
      };
    }
  },

  /**
   * 停止实例
   */
  async stopInstance(instanceId) {
    try {
      const response = await apiClient.post(`/api/instances/${instanceId}/stop`);
      return {
        success: true,
        data: response.data || response,
        message: '停止实例成功'
      };
    } catch (error) {
      console.error('停止实例失败:', error);
      return {
        success: false,
        error: error.message,
        message: '停止实例失败'
      };
    }
  },

  /**
   * 删除实例
   */
  async deleteInstance(instanceId) {
    try {
      const response = await apiClient.delete(`/api/instances/${instanceId}`);
      return {
        success: true,
        data: response.data || response,
        message: '删除实例成功'
      };
    } catch (error) {
      console.error('删除实例失败:', error);
      return {
        success: false,
        error: error.message,
        message: '删除实例失败'
      };
    }
  },

  /**
   * 批量创建实例
   */
  async batchCreateInstances(config) {
    try {
      const response = await apiClient.post('/api/instances/batch', config);
      return {
        success: true,
        data: response.data || response,
        message: '批量创建实例成功'
      };
    } catch (error) {
      console.error('批量创建实例失败:', error);
      return {
        success: false,
        error: error.message,
        message: '批量创建实例失败'
      };
    }
  }
};

/**
 * 系统管理API
 */
export const systemApi = {
  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    try {
      const response = await apiClient.get('/api/system/status');
      return {
        success: true,
        data: response.data || response,
        message: '获取系统状态成功'
      };
    } catch (error) {
      console.error('获取系统状态失败:', error);
      return {
        success: false,
        error: error.message,
        message: '获取系统状态失败'
      };
    }
  },

  /**
   * 获取系统配置
   */
  async getSystemConfig() {
    try {
      const response = await apiClient.get('/api/system/config');
      return {
        success: true,
        data: response.data || response,
        message: '获取系统配置成功'
      };
    } catch (error) {
      console.error('获取系统配置失败:', error);
      return {
        success: false,
        error: error.message,
        message: '获取系统配置失败'
      };
    }
  },

  /**
   * 更新系统配置
   */
  async updateSystemConfig(config) {
    try {
      const response = await apiClient.put('/api/system/config', config);
      return {
        success: true,
        data: response.data || response,
        message: '更新系统配置成功'
      };
    } catch (error) {
      console.error('更新系统配置失败:', error);
      return {
        success: false,
        error: error.message,
        message: '更新系统配置失败'
      };
    }
  }
};

/**
 * 健康检查API
 */
export const healthApi = {
  /**
   * 检查服务健康状态
   */
  async checkHealth() {
    try {
      const response = await apiClient.get('/health');
      return {
        success: true,
        data: response.data || response,
        message: '健康检查成功'
      };
    } catch (error) {
      console.error('健康检查失败:', error);
      return {
        success: false,
        error: error.message,
        message: '健康检查失败'
      };
    }
  }
};

// 导出API客户端实例
export default apiClient;
