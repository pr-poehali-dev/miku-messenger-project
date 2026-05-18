import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

interface SettingsViewProps {
  user: Record<string, unknown> | null;
}

type SettingValue = boolean | string | number;

interface Setting {
  id: string;
  label: string;
  description?: string;
  type: "toggle" | "select" | "slider" | "info" | "button";
  value?: SettingValue;
  options?: { label: string; value: string }[];
  min?: number; max?: number;
  action?: () => void;
  danger?: boolean;
}

interface SettingGroup {
  title: string;
  icon: string;
  settings: Setting[];
}

export default function SettingsView({ user }: SettingsViewProps) {
  const [values, setValues] = useState<Record<string, SettingValue>>({});
  const [saving, setSaving] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Уведомления");

  useEffect(() => {
    api.getSettings().then(res => {
      if (res.settings) setValues(res.settings);
    });
  }, []);

  const get = (id: string, def: SettingValue) => (id in values ? values[id] : def);
  const set = (id: string, val: SettingValue) => setValues(prev => ({ ...prev, [id]: val }));

  const save = async () => {
    setSaving(true);
    const res = await api.saveSettings(values);
    if (res.ok) toast.success("Настройки сохранены!");
    else toast.error("Ошибка сохранения");
    setSaving(false);
  };

  const GROUPS: SettingGroup[] = [
    {
      title: "Уведомления", icon: "Bell",
      settings: [
        { id: "notif_all", label: "Все уведомления", type: "toggle", value: true },
        { id: "notif_dm", label: "Личные сообщения", type: "toggle", value: true },
        { id: "notif_groups", label: "Группы", type: "toggle", value: true },
        { id: "notif_channels", label: "Каналы", type: "toggle", value: false },
        { id: "notif_gifts", label: "Подарки", type: "toggle", value: true },
        { id: "notif_sound", label: "Звуки уведомлений", type: "toggle", value: true },
        { id: "notif_vibro", label: "Вибрация", type: "toggle", value: false },
        { id: "notif_preview", label: "Предпросмотр сообщений", type: "toggle", value: true },
        { id: "notif_badge", label: "Показывать бейджи", type: "toggle", value: true },
        { id: "notif_mute_until", label: "Тихий режим", type: "select", value: "off", options: [{ label: "Выкл", value: "off" }, { label: "1 час", value: "1h" }, { label: "8 часов", value: "8h" }, { label: "Навсегда", value: "forever" }] },
      ]
    },
    {
      title: "Внешний вид", icon: "Palette",
      settings: [
        { id: "theme", label: "Тема", type: "select", value: "dark", options: [{ label: "Тёмная", value: "dark" }, { label: "AMOLED", value: "amoled" }, { label: "Синяя", value: "blue" }] },
        { id: "font_size", label: "Размер шрифта", type: "slider", value: 14, min: 11, max: 20 },
        { id: "compact_mode", label: "Компактный режим", type: "toggle", value: false },
        { id: "bubble_style", label: "Стиль пузырей", type: "select", value: "rounded", options: [{ label: "Скруглённые", value: "rounded" }, { label: "Острые", value: "sharp" }, { label: "Облачко", value: "cloud" }] },
        { id: "show_avatars", label: "Показывать аватарки", type: "toggle", value: true },
        { id: "animated_emoji", label: "Анимированные эмодзи", type: "toggle", value: true },
        { id: "glow_effects", label: "Эффекты свечения", type: "toggle", value: true },
        { id: "blur_bg", label: "Размытый фон", type: "toggle", value: true },
        { id: "sidebar_width", label: "Ширина панели", type: "slider", value: 72, min: 60, max: 100 },
        { id: "message_density", label: "Плотность сообщений", type: "select", value: "normal", options: [{ label: "Нормальная", value: "normal" }, { label: "Плотная", value: "dense" }, { label: "Просторная", value: "spacious" }] },
      ]
    },
    {
      title: "Конфиденциальность", icon: "Shield",
      settings: [
        { id: "show_online", label: "Показывать статус онлайн", type: "toggle", value: true },
        { id: "read_receipts", label: "Уведомление о прочтении", type: "toggle", value: true },
        { id: "typing_indicator", label: "Индикатор набора", type: "toggle", value: true },
        { id: "allow_dms", label: "Личные сообщения от", type: "select", value: "everyone", options: [{ label: "Все", value: "everyone" }, { label: "Только друзья", value: "friends" }, { label: "Никто", value: "nobody" }] },
        { id: "hide_phone", label: "Скрыть номер телефона", type: "toggle", value: true },
        { id: "hide_email", label: "Скрыть email", type: "toggle", value: false },
        { id: "two_factor", label: "Двухфакторная авт.", type: "toggle", value: false },
        { id: "session_timeout", label: "Автовыход через", type: "select", value: "never", options: [{ label: "Никогда", value: "never" }, { label: "30 дней", value: "30d" }, { label: "7 дней", value: "7d" }] },
        { id: "safe_search", label: "Безопасный поиск", type: "toggle", value: false },
        { id: "block_strangers", label: "Блокировать незнакомцев", type: "toggle", value: false },
      ]
    },
    {
      title: "Сообщения", icon: "MessageSquare",
      settings: [
        { id: "send_on_enter", label: "Отправка по Enter", type: "toggle", value: true },
        { id: "link_preview", label: "Предпросмотр ссылок", type: "toggle", value: true },
        { id: "auto_download_img", label: "Автозагрузка фото", type: "toggle", value: true },
        { id: "auto_download_video", label: "Автозагрузка видео", type: "toggle", value: false },
        { id: "spell_check", label: "Проверка орфографии", type: "toggle", value: true },
        { id: "emoji_autocomplete", label: "Автодополнение эмодзи", type: "toggle", value: true },
        { id: "message_delete_timer", label: "Автоудаление сообщений", type: "select", value: "never", options: [{ label: "Никогда", value: "never" }, { label: "1 час", value: "1h" }, { label: "1 день", value: "1d" }, { label: "1 неделя", value: "1w" }] },
        { id: "sticker_size", label: "Размер стикеров", type: "slider", value: 80, min: 40, max: 160 },
        { id: "swipe_reply", label: "Свайп для ответа", type: "toggle", value: true },
        { id: "show_timestamps", label: "Показывать время", type: "toggle", value: true },
      ]
    },
    {
      title: "Звонки", icon: "Phone",
      settings: [
        { id: "mic_default", label: "Микрофон по умолчанию", type: "select", value: "default", options: [{ label: "Системный", value: "default" }, { label: "Другой", value: "other" }] },
        { id: "speaker_default", label: "Динамик по умолчанию", type: "select", value: "default", options: [{ label: "Системный", value: "default" }, { label: "Наушники", value: "headphones" }] },
        { id: "noise_cancel", label: "Шумоподавление", type: "toggle", value: true },
        { id: "echo_cancel", label: "Эхоподавление", type: "toggle", value: true },
        { id: "auto_gain", label: "Автоусиление", type: "toggle", value: true },
        { id: "ring_incoming", label: "Звонок при входящем", type: "toggle", value: true },
        { id: "call_timeout", label: "Ожидание ответа (сек)", type: "slider", value: 30, min: 10, max: 60 },
        { id: "record_calls", label: "Запись звонков", type: "toggle", value: false },
        { id: "voice_to_text", label: "Голос в текст", type: "toggle", value: true },
        { id: "hd_calls", label: "HD-качество", type: "toggle", value: false },
      ]
    },
    {
      title: "Группы и каналы", icon: "Users",
      settings: [
        { id: "auto_join_links", label: "Авто-вступление по ссылке", type: "toggle", value: true },
        { id: "show_member_join", label: "Сообщение о вступлении", type: "toggle", value: true },
        { id: "pin_to_top", label: "Закреплять важное наверху", type: "toggle", value: true },
        { id: "admin_notifs", label: "Уведомления от admin", type: "toggle", value: true },
        { id: "max_group_notifs", label: "Макс. уведомлений/час", type: "slider", value: 10, min: 0, max: 50 },
        { id: "mute_bots", label: "Мьютировать ботов", type: "toggle", value: false },
        { id: "channel_auto_sub", label: "Автоподписка на каналы", type: "toggle", value: false },
        { id: "show_reactions", label: "Показывать реакции", type: "toggle", value: true },
        { id: "slow_mode", label: "Медленный режим", type: "toggle", value: false },
        { id: "group_backup", label: "Бэкап истории группы", type: "toggle", value: false },
      ]
    },
    {
      title: "Язык и регион", icon: "Globe",
      settings: [
        { id: "language", label: "Язык", type: "select", value: "ru", options: [{ label: "Русский", value: "ru" }, { label: "English", value: "en" }, { label: "日本語", value: "ja" }] },
        { id: "date_format", label: "Формат даты", type: "select", value: "dmy", options: [{ label: "ДД.ММ.ГГ", value: "dmy" }, { label: "ММ/ДД/ГГ", value: "mdy" }, { label: "ГГ-ММ-ДД", value: "ymd" }] },
        { id: "time_format", label: "Формат времени", type: "select", value: "24h", options: [{ label: "24 часа", value: "24h" }, { label: "12 часов", value: "12h" }] },
        { id: "timezone", label: "Часовой пояс", description: "Определяется автоматически", type: "info" },
      ]
    },
    {
      title: "Аккаунт", icon: "User",
      settings: [
        { id: "email_info", label: "Email", description: user?.email as string || "—", type: "info" },
        { id: "username_info", label: "Юзернейм", description: `@${user?.username as string || ""}`, type: "info" },
        { id: "change_password", label: "Изменить пароль", type: "button", action: () => toast.info("Функция скоро появится") },
        { id: "delete_account", label: "Удалить аккаунт", type: "button", danger: true, action: () => toast.error("Функция скоро появится") },
      ]
    },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--miku-panel)" }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(0,212,232,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 18, margin: 0 }}>Настройки</h2>
          <p style={{ color: "rgba(0,212,232,0.4)", fontSize: 12, margin: "4px 0 0" }}>
            {GROUPS.reduce((acc, g) => acc + g.settings.length, 0)} параметров
          </p>
        </div>
        <button onClick={save} disabled={saving} style={{
          padding: "8px 16px", border: "none", borderRadius: 10, cursor: "pointer",
          background: "linear-gradient(135deg,#00d4e8,#0ea5e9)",
          color: "#060e1a", fontWeight: 800, fontSize: 12,
          fontFamily: "'Nunito',sans-serif",
          display: "flex", alignItems: "center", gap: 5,
          boxShadow: "0 4px 12px rgba(0,212,232,0.25)",
          opacity: saving ? 0.6 : 1,
        }}>
          <Icon name="Save" size={13} />
          {saving ? "..." : "Сохранить"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {GROUPS.map(group => (
          <SettingGroup
            key={group.title}
            group={group}
            expanded={expandedGroup === group.title}
            onToggle={() => setExpandedGroup(expandedGroup === group.title ? null : group.title)}
            getValue={(id, def) => get(id, def)}
            setValue={set}
          />
        ))}
      </div>
    </div>
  );
}

function SettingGroup({ group, expanded, onToggle, getValue, setValue }: {
  group: SettingGroup; expanded: boolean; onToggle: () => void;
  getValue: (id: string, def: SettingValue) => SettingValue;
  setValue: (id: string, val: SettingValue) => void;
}) {
  return (
    <div style={{ marginBottom: 8, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,212,232,0.08)" }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "14px 16px", border: "none", cursor: "pointer",
        background: expanded ? "rgba(0,212,232,0.08)" : "rgba(13,31,56,0.5)",
        display: "flex", alignItems: "center", gap: 10,
        transition: "background 0.2s",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: "rgba(0,212,232,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
          color: expanded ? "#00d4e8" : "rgba(0,212,232,0.5)",
        }}>
          <Icon name={group.icon} size={16} />
        </div>
        <span style={{ flex: 1, color: "#e0f7ff", fontWeight: 700, fontSize: 14, textAlign: "left", fontFamily: "'Nunito',sans-serif" }}>
          {group.title}
        </span>
        <span style={{ color: "rgba(0,212,232,0.3)", fontSize: 11 }}>{group.settings.length}</span>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} />
      </button>

      <div style={{
        maxHeight: expanded ? `${group.settings.length * 64}px` : 0,
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {group.settings.map((setting, i) => (
          <div key={setting.id} style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(0,212,232,0.05)",
            background: i % 2 === 0 ? "rgba(6,14,26,0.3)" : "transparent",
            display: "flex", alignItems: "center", gap: 12,
            animation: expanded ? `fadeIn 0.2s ease ${i * 0.03}s both` : "none",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: setting.danger ? "#ff6b6b" : "#e0f7ff", fontWeight: 600, fontSize: 13 }}>{setting.label}</div>
              {setting.description && <div style={{ color: "rgba(0,212,232,0.35)", fontSize: 11, marginTop: 2 }}>{setting.description}</div>}
            </div>
            <SettingControl setting={setting} getValue={getValue} setValue={setValue} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingControl({ setting, getValue, setValue }: {
  setting: Setting;
  getValue: (id: string, def: SettingValue) => SettingValue;
  setValue: (id: string, val: SettingValue) => void;
}) {
  const val = getValue(setting.id, setting.value ?? false);

  if (setting.type === "toggle") {
    const on = val as boolean;
    return (
      <div onClick={() => setValue(setting.id, !on)} style={{
        width: 40, height: 22, borderRadius: 11, cursor: "pointer", flexShrink: 0,
        background: on ? "linear-gradient(135deg,#00d4e8,#0ea5e9)" : "rgba(0,212,232,0.1)",
        border: `1px solid ${on ? "transparent" : "rgba(0,212,232,0.15)"}`,
        position: "relative", transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: on ? "0 0 8px rgba(0,212,232,0.3)" : "none",
      }}>
        <div style={{
          position: "absolute", top: 2, left: on ? 20 : 2,
          width: 16, height: 16, borderRadius: "50%",
          background: on ? "#060e1a" : "rgba(0,212,232,0.4)",
          transition: "left 0.25s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </div>
    );
  }

  if (setting.type === "select") {
    return (
      <select value={val as string} onChange={e => setValue(setting.id, e.target.value)} style={{
        background: "rgba(0,212,232,0.06)", border: "1px solid rgba(0,212,232,0.15)",
        borderRadius: 8, color: "#e0f7ff", padding: "4px 8px", fontSize: 12, outline: "none",
        cursor: "pointer", fontFamily: "'Nunito',sans-serif", flexShrink: 0,
        maxWidth: 130,
      }}>
        {setting.options?.map(o => <option key={o.value} value={o.value} style={{ background: "#0a1628" }}>{o.label}</option>)}
      </select>
    );
  }

  if (setting.type === "slider") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <input type="range" min={setting.min} max={setting.max} value={val as number}
          onChange={e => setValue(setting.id, Number(e.target.value))}
          style={{ width: 90, accentColor: "#00d4e8" }} />
        <span style={{ color: "#00d4e8", fontWeight: 700, fontSize: 12, width: 28, textAlign: "right" }}>{val}</span>
      </div>
    );
  }

  if (setting.type === "button") {
    return (
      <button onClick={setting.action} style={{
        padding: "5px 12px", border: `1px solid ${setting.danger ? "rgba(255,107,107,0.3)" : "rgba(0,212,232,0.2)"}`,
        borderRadius: 8, background: "transparent", cursor: "pointer",
        color: setting.danger ? "#ff6b6b" : "#00d4e8", fontWeight: 700, fontSize: 12,
        fontFamily: "'Nunito',sans-serif", flexShrink: 0, transition: "all 0.2s",
      }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = setting.danger ? "rgba(255,107,107,0.08)" : "rgba(0,212,232,0.08)"}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
      >
        Открыть
      </button>
    );
  }

  return null;
}
