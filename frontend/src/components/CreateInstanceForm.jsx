import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Card,
  Row,
  Col,
  Space,
  message,
  Divider,
  Alert
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { instanceApi } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

const CreateInstanceForm = ({ onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewConfig, setPreviewConfig] = useState(null);

  // 预设配置模板
  const templates = [
    {
      name: 'development',
      label: '开发环境',
      config: {
        cpu_request: '200m',
        memory_request: '512Mi',
        storage: '10Gi',
        extensions: ['ms-python.python', 'ms-vscode.vscode-typescript-next']
      }
    },
    {
      name: 'production',
      label: '生产环境',
      config: {
        cpu_request: '1000m',
        memory_request: '2Gi',
        storage: '50Gi',
        extensions: ['ms-python.python', 'ms-vscode.vscode-typescript-next', 'ms-vscode.vscode-eslint']
      }
    },
    {
      name: 'testing',
      label: '测试环境',
      config: {
        cpu_request: '500m',
        memory_request: '1Gi',
        storage: '20Gi',
        extensions: ['ms-python.python', 'ms-vscode.vscode-jest']
      }
    }
  ];

  // 可用扩展列表
  const availableExtensions = [
    { value: 'ms-python.python', label: 'Python' },
    { value: 'ms-vscode.vscode-typescript-next', label: 'TypeScript' },
    { value: 'ms-vscode.vscode-eslint', label: 'ESLint' },
    { value: 'ms-vscode.vscode-jest', label: 'Jest' },
    { value: 'ms-vscode.vscode-json', label: 'JSON' },
    { value: 'bradlc.vscode-tailwindcss', label: 'Tailwind CSS' },
    { value: 'esbenp.prettier-vscode', label: 'Prettier' }
  ];

  // 应用模板配置
  const applyTemplate = (templateName) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      form.setFieldsValue({
        cpu_request: template.config.cpu_request,
        memory_request: template.config.memory_request,
        storage: template.config.storage,
        extensions: template.config.extensions
      });
      message.success(`已应用${template.label}模板`);
    }
  };

  // 表单提交
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 构建创建请求数据
      const createData = {
        config: {
          id: values.instance_id || undefined,
          name: values.instance_name,
          resources: {
            cpu_request: values.cpu_request,
            memory_request: values.memory_request,
            storage: values.storage
          },
          extensions: values.extensions || [],
          auto_start: values.auto_start || false,
          description: values.description || ''
        }
      };

      message.loading({ content: '正在创建实例...', key: 'create' });

      // 调用API创建实例
      const response = await instanceApi.createInstance(createData);

      if (response.success) {
        message.success({ content: '实例创建成功！', key: 'create' });

        if (onSuccess) {
          onSuccess(response.data.instance);
        }

        // 重置表单
        form.resetFields();
      } else {
        message.error({ content: response.message || '实例创建失败', key: 'create' });
      }

    } catch (error) {
      message.error({ content: '实例创建失败', key: 'create' });
      console.error('创建实例错误:', error);
    } finally {
      setLoading(false);
    }
  };

  // 预览配置
  const handlePreview = () => {
    form.validateFields().then(values => {
      setPreviewConfig(values);
    }).catch(() => {
      message.warning('请先完善表单信息');
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Alert
        message="创建新实例"
        description="请填写实例配置信息，系统将为您创建一个独立的VS Code开发环境"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          cpu_request: '200m',
          memory_request: '512Mi',
          storage: '10Gi',
          auto_start: false,
          extensions: ['ms-python.python']
        }}
      >
        <Card title="基本信息" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="实例名称"
                name="instance_name"
                rules={[
                  { required: true, message: '请输入实例名称' },
                  { min: 3, max: 50, message: '名称长度为3-50个字符' }
                ]}
              >
                <Input placeholder="请输入实例名称" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="实例ID"
                name="instance_id"
                rules={[
                  { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' }
                ]}
              >
                <Input placeholder="留空自动生成" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="请输入实例描述（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Card>

        <Card title="资源配置" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ marginRight: 8 }}>快速模板：</span>
            <Space>
              {templates.map(template => (
                <Button
                  key={template.name}
                  size="small"
                  onClick={() => applyTemplate(template.name)}
                >
                  {template.label}
                </Button>
              ))}
            </Space>
          </div>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="CPU请求"
                name="cpu_request"
                rules={[{ required: true, message: '请输入CPU请求' }]}
              >
                <Select placeholder="选择CPU配置">
                  <Option value="100m">100m (0.1核)</Option>
                  <Option value="200m">200m (0.2核)</Option>
                  <Option value="500m">500m (0.5核)</Option>
                  <Option value="1000m">1000m (1核)</Option>
                  <Option value="2000m">2000m (2核)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="内存请求"
                name="memory_request"
                rules={[{ required: true, message: '请输入内存请求' }]}
              >
                <Select placeholder="选择内存配置">
                  <Option value="256Mi">256Mi</Option>
                  <Option value="512Mi">512Mi</Option>
                  <Option value="1Gi">1Gi</Option>
                  <Option value="2Gi">2Gi</Option>
                  <Option value="4Gi">4Gi</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="存储空间"
                name="storage"
                rules={[{ required: true, message: '请输入存储空间' }]}
              >
                <Select placeholder="选择存储配置">
                  <Option value="5Gi">5Gi</Option>
                  <Option value="10Gi">10Gi</Option>
                  <Option value="20Gi">20Gi</Option>
                  <Option value="50Gi">50Gi</Option>
                  <Option value="100Gi">100Gi</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="扩展配置" style={{ marginBottom: 24 }}>
          <Form.Item
            label="VS Code扩展"
            name="extensions"
          >
            <Select
              mode="multiple"
              placeholder="选择要安装的扩展"
              options={availableExtensions}
              showSearch
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            label="创建后自动启动"
            name="auto_start"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>

        {/* 配置预览 */}
        {previewConfig && (
          <Card title="配置预览" style={{ marginBottom: 24 }}>
            <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {JSON.stringify(previewConfig, null, 2)}
            </pre>
          </Card>
        )}

        <Card>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              loading={loading}
              size="large"
            >
              创建实例
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={handlePreview}
              size="large"
            >
              预览配置
            </Button>

            {onCancel && (
              <Button
                onClick={onCancel}
                size="large"
              >
                取消
              </Button>
            )}
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default CreateInstanceForm;
