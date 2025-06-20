import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Card,
  message,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { instanceApi } from '../services/api';

const { Search } = Input;
const { Option } = Select;

const InstanceList = () => {
  const navigate = useNavigate();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  // 模拟数据
  const mockInstances = [
    {
      id: 'instance-001',
      name: 'Development Instance 1',
      status: 'running',
      created_at: '2025-01-20T10:00:00Z',
      ports: { web_port: 8080, debug_port: 9229 },
      resources: { cpu: '500m', memory: '1Gi' }
    },
    {
      id: 'instance-002',
      name: 'Test Instance 2',
      status: 'stopped',
      created_at: '2025-01-20T11:00:00Z',
      ports: { web_port: 8081, debug_port: 9230 },
      resources: { cpu: '200m', memory: '512Mi' }
    },
    {
      id: 'instance-003',
      name: 'Production Instance 3',
      status: 'starting',
      created_at: '2025-01-20T12:00:00Z',
      ports: { web_port: 8082, debug_port: 9231 },
      resources: { cpu: '1000m', memory: '2Gi' }
    }
  ];

  // 获取实例列表
  const fetchInstances = async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = {
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
        status: filters.status !== 'all' ? filters.status : undefined,
        search: filters.search || undefined
      };

      // 调用API
      const response = await instanceApi.getInstances(params);

      if (response.success) {
        // API成功响应
        const data = response.data;
        setInstances(data.instances || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || data.instances?.length || 0
        }));
      } else {
        // API失败，使用模拟数据作为降级
        console.warn('API调用失败，使用模拟数据:', response.error);

        let filteredData = mockInstances;

        if (filters.status !== 'all') {
          filteredData = filteredData.filter(item => item.status === filters.status);
        }

        if (filters.search) {
          filteredData = filteredData.filter(item =>
            item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.id.toLowerCase().includes(filters.search.toLowerCase())
          );
        }

        setInstances(filteredData);
        setPagination(prev => ({
          ...prev,
          total: filteredData.length
        }));

        message.warning('后端服务不可用，显示模拟数据');
      }

    } catch (error) {
      message.error('获取实例列表失败');
      console.error('获取实例列表错误:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, [filters]);

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

  // 操作按钮
  const renderActions = (record) => {
    return (
      <Space size="small">
        <Tooltip title="查看详情">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/instances/${record.id}`)}
          />
        </Tooltip>

        {record.status === 'stopped' || record.status === 'created' ? (
          <Tooltip title="启动实例">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record.id)}
            />
          </Tooltip>
        ) : (
          <Tooltip title="停止实例">
            <Button
              type="text"
              icon={<PauseCircleOutlined />}
              onClick={() => handleStop(record.id)}
            />
          </Tooltip>
        )}

        <Popconfirm
          title="确定要删除这个实例吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Tooltip title="删除实例">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    );
  };

  // 启动实例
  const handleStart = async (instanceId) => {
    try {
      message.loading({ content: '正在启动实例...', key: instanceId });

      // 调用API启动实例
      const response = await instanceApi.startInstance(instanceId);

      if (response.success) {
        message.success({ content: '实例启动成功', key: instanceId });
        // 更新本地状态
        setInstances(prev => prev.map(instance =>
          instance.id === instanceId
            ? { ...instance, status: 'starting' }
            : instance
        ));
        // 刷新列表
        setTimeout(() => fetchInstances(), 1000);
      } else {
        message.error({ content: response.message || '实例启动失败', key: instanceId });
      }
    } catch (error) {
      message.error({ content: '实例启动失败', key: instanceId });
      console.error('启动实例错误:', error);
    }
  };

  // 停止实例
  const handleStop = async (instanceId) => {
    try {
      message.loading({ content: '正在停止实例...', key: instanceId });

      // 调用API停止实例
      const response = await instanceApi.stopInstance(instanceId);

      if (response.success) {
        message.success({ content: '实例停止成功', key: instanceId });
        // 更新本地状态
        setInstances(prev => prev.map(instance =>
          instance.id === instanceId
            ? { ...instance, status: 'stopping' }
            : instance
        ));
        // 刷新列表
        setTimeout(() => fetchInstances(), 1000);
      } else {
        message.error({ content: response.message || '实例停止失败', key: instanceId });
      }
    } catch (error) {
      message.error({ content: '实例停止失败', key: instanceId });
      console.error('停止实例错误:', error);
    }
  };

  // 删除实例
  const handleDelete = async (instanceId) => {
    try {
      message.loading({ content: '正在删除实例...', key: instanceId });

      // 调用API删除实例
      const response = await instanceApi.deleteInstance(instanceId);

      if (response.success) {
        message.success({ content: '实例删除成功', key: instanceId });
        // 从本地状态中移除
        setInstances(prev => prev.filter(instance => instance.id !== instanceId));
        // 更新分页总数
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1
        }));
      } else {
        message.error({ content: response.message || '实例删除失败', key: instanceId });
      }
    } catch (error) {
      message.error({ content: '实例删除失败', key: instanceId });
      console.error('删除实例错误:', error);
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '实例ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      ellipsis: true,
    },
    {
      title: '实例名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatus,
    },
    {
      title: '端口',
      key: 'ports',
      width: 120,
      render: (_, record) => (
        <div>
          <div>Web: {record.ports.web_port}</div>
          <div>Debug: {record.ports.debug_port}</div>
        </div>
      ),
    },
    {
      title: '资源',
      key: 'resources',
      width: 120,
      render: (_, record) => (
        <div>
          <div>CPU: {record.resources.cpu}</div>
          <div>内存: {record.resources.memory}</div>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => renderActions(record),
    },
  ];

  return (
    <Card>
      {/* 过滤器 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Search
          placeholder="搜索实例名称或ID"
          allowClear
          style={{ width: 300 }}
          onSearch={(value) => setFilters(prev => ({ ...prev, search: value }))}
          prefix={<SearchOutlined />}
        />

        <Select
          value={filters.status}
          style={{ width: 120 }}
          onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
        >
          <Option value="all">全部状态</Option>
          <Option value="running">运行中</Option>
          <Option value="stopped">已停止</Option>
          <Option value="starting">启动中</Option>
          <Option value="stopping">停止中</Option>
          <Option value="created">已创建</Option>
        </Select>

        <Button
          icon={<ReloadOutlined />}
          onClick={fetchInstances}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* 实例表格 */}
      <Table
        columns={columns}
        dataSource={instances}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
        scroll={{ x: 800 }}
      />
    </Card>
  );
};

export default InstanceList;
