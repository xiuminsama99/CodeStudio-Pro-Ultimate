import React from 'react';
import { Card, Button, Space, Typography, Tag, Divider } from 'antd';
import { useAppStore, selectors } from '../store/index.jsx';

const { Title, Text } = Typography;

const StateTest = () => {
  const { state, actions } = useAppStore();

  const handleTestActions = () => {
    // 测试状态更新
    actions.updateSettings({ theme: state.settings.theme === 'light' ? 'dark' : 'light' });
    actions.toggleSidebar();
  };

  const handleFetchInstances = () => {
    actions.fetchInstances();
  };

  const handleCheckSystem = () => {
    actions.checkSystemStatus();
  };

  return (
    <Card title="状态管理测试" style={{ margin: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 实例状态 */}
        <div>
          <Title level={4}>实例状态</Title>
          <Text>实例数量: {selectors.getInstances(state).length}</Text><br />
          <Text>运行中实例: {selectors.getRunningInstances(state).length}</Text><br />
          <Text>加载状态: {selectors.getInstancesLoading(state) ? '加载中' : '已完成'}</Text><br />
          <Button onClick={handleFetchInstances} style={{ marginTop: 8 }}>
            刷新实例列表
          </Button>
        </div>

        <Divider />

        {/* 系统状态 */}
        <div>
          <Title level={4}>系统状态</Title>
          <Text>系统健康: </Text>
          <Tag color={selectors.getSystemStatus(state).healthy ? 'green' : 'red'}>
            {selectors.getSystemStatus(state).healthy ? '正常' : '异常'}
          </Tag><br />
          <Text>最后检查: {selectors.getSystemStatus(state).lastCheck || '未检查'}</Text><br />
          <Button onClick={handleCheckSystem} style={{ marginTop: 8 }}>
            检查系统状态
          </Button>
        </div>

        <Divider />

        {/* UI状态 */}
        <div>
          <Title level={4}>UI状态</Title>
          <Text>侧边栏折叠: </Text>
          <Tag color={selectors.getSidebarCollapsed(state) ? 'blue' : 'default'}>
            {selectors.getSidebarCollapsed(state) ? '已折叠' : '展开'}
          </Tag><br />
          <Text>主题: {selectors.getSettings(state).theme}</Text><br />
          <Text>自动刷新: {selectors.getSettings(state).autoRefresh ? '开启' : '关闭'}</Text><br />
          <Button onClick={handleTestActions} style={{ marginTop: 8 }}>
            切换主题和侧边栏
          </Button>
        </div>

        <Divider />

        {/* 状态同步测试 */}
        <div>
          <Title level={4}>状态同步测试</Title>
          <Text>当前时间戳: {new Date().toLocaleTimeString()}</Text><br />
          <Text>状态对象: {JSON.stringify({
            instanceCount: state.instances.length,
            sidebarCollapsed: state.sidebarCollapsed,
            theme: state.settings.theme
          })}</Text>
        </div>
      </Space>
    </Card>
  );
};

export default StateTest;
