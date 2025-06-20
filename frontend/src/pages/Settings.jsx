import React from 'react';
import { Typography, Card, Tabs, Form, Input, Switch, Button, Space, Divider } from 'antd';

const { Title } = Typography;
const { TabPane } = Tabs;

const Settings = () => {
  const [form] = Form.useForm();

  const handleSave = (values) => {
    console.log('保存设置:', values);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>系统设置</Title>

      <Card>
        <Tabs defaultActiveKey="general">
          <TabPane tab="常规设置" key="general">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                autoSave: true,
                notifications: true,
                theme: 'light'
              }}
            >
              <Form.Item
                label="系统名称"
                name="systemName"
                rules={[{ required: true, message: '请输入系统名称' }]}
              >
                <Input placeholder="CodeStudio Pro Ultimate 3.0" />
              </Form.Item>

              <Form.Item
                label="自动保存"
                name="autoSave"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="桌面通知"
                name="notifications"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Divider />

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    保存设置
                  </Button>
                  <Button onClick={() => form.resetFields()}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="实例配置" key="instance">
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Title level={4}>实例配置</Title>
              <p>实例配置选项正在开发中...</p>
            </div>
          </TabPane>

          <TabPane tab="安全设置" key="security">
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Title level={4}>安全设置</Title>
              <p>安全设置选项正在开发中...</p>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;
