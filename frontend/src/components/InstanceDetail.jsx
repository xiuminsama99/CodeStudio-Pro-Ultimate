import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Progress,
  Statistic,
  Alert,
  message,
  Popconfirm,
  Spin
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DesktopOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { instanceApi } from '../services/api';

const InstanceDetail = ({ instanceId, onBack }) => {
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 模拟实例数据
  const mockInstance = {
    id: instanceId || 'instance-001',
    name: 'Development Instance 1',
    status: 'running',
    created_at: '2025-01-20T10:00:00Z',
    started_at: '2025-01-20T10:05:00Z',
    ports: {
      web_port: 8080,
      debug_port: 9229,
      callback_port: 8081
    },
    resources: {
      cpu_request: '500m',
      memory_request: '1Gi',
      cpu_usage: 45.6,
      memory_usage: 67.8,
      disk_usage: 23.4
    },
    config: {
      image: 'vscode:latest',
      workspace: '/workspace',
      extensions: ['ms-python.python', 'ms-vscode.vscode-typescript-next']
    },
    metadata: {
      version: '1.0.0',
      architecture: 'microservice',
      managed_by: 'instance-service'
    },
    paths: {
      base_path: './instances/instance-001',
      workspace: './instances/instance-001/workspace',
      user_data: './instances/instance-001/user-data'
    }
  };

  // 获取实例详情
  const fetchInstanceDetail = async () => {
    setLoading(true);
    try {
      // 调用API获取实例详情
      const response = await instanceApi.getInstance(instanceId);

      if (response.success) {
        setInstance(response.data.instance);
      } else {
        // API失败，使用模拟数据作为降级
        console.warn('API调用失败，使用模拟数据:', response.error);
        setInstance(mockInstance);
        message.warning('后端服务不可用，显示模拟数据');
      }
    } catch (error) {
      message.error('获取实例详情失败');
      console.error('获取实例详情错误:', error);
      // 使用模拟数据作为降级
      setInstance(mockInstance);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstanceDetail();

    // 模拟状态实时更新
    const interval = setInterval(() => {
      if (instance && instance.status === 'running') {
        setInstance(prev => ({
          ...prev,
          resources: {
            ...prev.resources,
            cpu_usage: Math.random() * 100,
            memory_usage: Math.random() * 100,
            disk_usage: Math.random() * 100
          }
        }));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [instanceId]);

  // 状态标签渲染
  const renderStatus = (status) => {
    const statusConfig = {
      running: { color: 'green', text: '运行中' },
      stopped: { color: 'red', text: '已停止' },
      starting: { color: 'blue', text: '启动中' },
      stopping: { color: 'orange', text: '停止中' },
      created: { color: 'default', text: '已创建' }
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 启动实例
  const handleStart = async () => {
    setActionLoading(true);
    try {
      message.loading({ content: '正在启动实例...', key: 'action' });

      const response = await instanceApi.startInstance(instanceId);

      if (response.success) {
        setInstance(prev => ({ ...prev, status: 'starting', started_at: new Date().toISOString() }));
        message.success({ content: '实例启动成功', key: 'action' });
        // 延迟刷新详情
        setTimeout(() => fetchInstanceDetail(), 2000);
      } else {
        message.error({ content: response.message || '实例启动失败', key: 'action' });
      }
    } catch (error) {
      message.error({ content: '实例启动失败', key: 'action' });
      console.error('启动实例错误:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // 停止实例
  const handleStop = async () => {
    setActionLoading(true);
    try {
      message.loading({ content: '正在停止实例...', key: 'action' });

      const response = await instanceApi.stopInstance(instanceId);

      if (response.success) {
        setInstance(prev => ({ ...prev, status: 'stopping' }));
        message.success({ content: '实例停止成功', key: 'action' });
        // 延迟刷新详情
        setTimeout(() => fetchInstanceDetail(), 2000);
      } else {
        message.error({ content: response.message || '实例停止失败', key: 'action' });
      }
    } catch (error) {
      message.error({ content: '实例停止失败', key: 'action' });
      console.error('停止实例错误:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // 删除实例
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      message.loading({ content: '正在删除实例...', key: 'action' });

      const response = await instanceApi.deleteInstance(instanceId);

      if (response.success) {
        message.success({ content: '实例删除成功', key: 'action' });
        if (onBack) onBack();
      } else {
        message.error({ content: response.message || '实例删除失败', key: 'action' });
      }
    } catch (error) {
      message.error({ content: '实例删除失败', key: 'action' });
      console.error('删除实例错误:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载实例详情中...</div>
      </div>
    );
  }

  if (!instance) {
    return (
      <Alert
        message="实例不存在"
        description="未找到指定的实例信息"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 实例状态警告 */}
      {instance.status === 'stopped' && (
        <Alert
          message="实例已停止"
          description="实例当前处于停止状态，部分功能可能不可用"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 操作按钮 */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          {instance.status === 'stopped' || instance.status === 'created' ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={actionLoading}
            >
              启动实例
            </Button>
          ) : (
            <Button
              icon={<PauseCircleOutlined />}
              onClick={handleStop}
              loading={actionLoading}
            >
              停止实例
            </Button>
          )}

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchInstanceDetail}
            loading={loading}
          >
            刷新
          </Button>

          <Popconfirm
            title="确定要删除这个实例吗？"
            description="删除后无法恢复，请谨慎操作"
            onConfirm={handleDelete}
            okText="确定"
            cancelText="取消"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={actionLoading}
            >
              删除实例
            </Button>
          </Popconfirm>
        </Space>
      </Card>

      <Row gutter={[24, 24]}>
        {/* 基本信息 */}
        <Col xs={24} lg={12}>
          <Card title="基本信息" extra={renderStatus(instance.status)}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="实例ID">{instance.id}</Descriptions.Item>
              <Descriptions.Item label="实例名称">{instance.name}</Descriptions.Item>
              <Descriptions.Item label="状态">{renderStatus(instance.status)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(instance.created_at).toLocaleString()}
              </Descriptions.Item>
              {instance.started_at && (
                <Descriptions.Item label="启动时间">
                  {new Date(instance.started_at).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* 端口信息 */}
        <Col xs={24} lg={12}>
          <Card title="端口配置">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Web端口">{instance.ports.web_port}</Descriptions.Item>
              <Descriptions.Item label="调试端口">{instance.ports.debug_port}</Descriptions.Item>
              <Descriptions.Item label="回调端口">{instance.ports.callback_port}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 资源使用情况 */}
        <Col xs={24}>
          <Card title="资源使用情况">
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="CPU使用率"
                  value={instance.resources.cpu_usage}
                  precision={1}
                  suffix="%"
                />
                <Progress
                  percent={instance.resources.cpu_usage}
                  status={instance.resources.cpu_usage > 80 ? 'exception' : 'normal'}
                  showInfo={false}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="内存使用率"
                  value={instance.resources.memory_usage}
                  precision={1}
                  suffix="%"
                />
                <Progress
                  percent={instance.resources.memory_usage}
                  status={instance.resources.memory_usage > 80 ? 'exception' : 'normal'}
                  showInfo={false}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="磁盘使用率"
                  value={instance.resources.disk_usage}
                  precision={1}
                  suffix="%"
                />
                <Progress
                  percent={instance.resources.disk_usage}
                  status={instance.resources.disk_usage > 80 ? 'exception' : 'normal'}
                  showInfo={false}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 配置信息 */}
        <Col xs={24} lg={12}>
          <Card title="配置信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="镜像">{instance.config.image}</Descriptions.Item>
              <Descriptions.Item label="工作目录">{instance.config.workspace}</Descriptions.Item>
              <Descriptions.Item label="CPU请求">{instance.resources.cpu_request}</Descriptions.Item>
              <Descriptions.Item label="内存请求">{instance.resources.memory_request}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 路径信息 */}
        <Col xs={24} lg={12}>
          <Card title="路径信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="基础路径">{instance.paths.base_path}</Descriptions.Item>
              <Descriptions.Item label="工作空间">{instance.paths.workspace}</Descriptions.Item>
              <Descriptions.Item label="用户数据">{instance.paths.user_data}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InstanceDetail;
