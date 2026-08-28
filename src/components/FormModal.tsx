/**
 * 统一表单弹窗（M4-T05，T06 起全域复用）。
 *
 * 组件选型：Semi `Modal` + `Form`（均已查证）。提交链路：
 * `Modal.onOk → formApi.submitForm() → Form.onSubmit(values) → props.onSubmit(values)`；
 * 由调用方在 `onSubmit` 中发 mutation 并自行关闭弹窗。
 */
import { useRef } from "react";
import { Form, Modal } from "@douyinfe/semi-ui";
import type { FormApi } from "@douyinfe/semi-ui/lib/es/form";
import { useTranslation } from "react-i18next";

/** FormModal 属性。 */
export interface FormModalProps<TValues> {
  /** 是否可见 */
  visible: boolean;
  /** 标题 */
  title: string;
  /** 表单初值 */
  initialValues?: Record<string, unknown>;
  /** 提交中（Modal 确认按钮 loading） */
  submitting?: boolean;
  /** 提交回调（Form 校验通过后触发） */
  onSubmit: (values: TValues) => void;
  /** 关闭回调（取消 / 遮罩 / ESC） */
  onClose: () => void;
  /** 弹窗宽度（默认 480） */
  width?: number;
  /** 确认按钮文案（默认 common:action.save） */
  okText?: string;
  /** 表单内容 */
  children: React.ReactNode;
}

/**
 * 统一表单弹窗。
 *
 * @param props 可见性 / 标题 / 初值 / 提交与关闭回调 / 表单内容
 * @returns Modal + Form 封装
 */
export function FormModal<TValues extends object>({
  visible,
  title,
  initialValues,
  submitting = false,
  onSubmit,
  onClose,
  width = 480,
  okText,
  children,
}: FormModalProps<TValues>) {
  const { t } = useTranslation("common");
  const formApiRef = useRef<FormApi | null>(null);

  return (
    <Modal
      title={title}
      visible={visible}
      width={width}
      okText={okText ?? t("action.save")}
      cancelText={t("action.cancel")}
      confirmLoading={submitting}
      onOk={() => formApiRef.current?.submitForm()}
      onCancel={onClose}
      afterClose={() => formApiRef.current?.reset()}
      destroyOnClose
      aria-label={title}
    >
      <Form
        initValues={initialValues}
        getFormApi={(api: FormApi) => {
          formApiRef.current = api;
        }}
        onSubmit={(values) => onSubmit(values as TValues)}
      >
        {children}
      </Form>
    </Modal>
  );
}
