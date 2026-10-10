/**
 * 我的通讯录页（M4-T06；路由 /address-book/personal，仅需登录）。
 *
 * 个人地址簿为幂等取/建（GET /api/ab/personal），联系人/标签管理按钮由
 * AbPeersSection 内的 PermissionButton 按 address_books.edit/share 守卫
 * （前端只做显隐，后端实时复核）。
 */
import { Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { usePersonalAb } from "@/api/hooks/addressBook";
import { AbPeersSection } from "@/pages/address-book/AbCommon";
import { toDisplayMessage } from "@/api/error";

/**
 * 我的通讯录页。
 *
 * @returns 页头 + 联系人区块（未取到个人簿时给出空态/错误态）
 */
export function PersonalAb() {
  const { t } = useTranslation("pages");
  const personalQuery = usePersonalAb();

  const guid = personalQuery.data?.guid ?? "";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey="menu:abPersonal">
        {guid.length > 0 ? <Tag color="blue">{guid.slice(0, 8)}…</Tag> : null}
      </PageHeader>
      {guid.length > 0 ? (
        <AbPeersSection abGuid={guid} editable />
      ) : personalQuery.isError ? (
        <div className="text-sm text-[var(--semi-color-danger)]">{toDisplayMessage(personalQuery.error)}</div>
      ) : null}
      <span className="hidden">{t("addressBook.personalHint")}</span>
    </div>
  );
}
