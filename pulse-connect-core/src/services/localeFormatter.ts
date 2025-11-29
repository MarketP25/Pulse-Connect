import { Locale } from "@/types/i18n";
import { LOCALE_REGION_MAPPING } from "@/config/lang";

interface FormatOptions {
  locale: Locale;
  timeZone?: string;
  currency?: string;
}

class LocaleFormatter {
  private locale: Locale;
  private region: string;
  private timeZone: string;
  private currency: string;

  constructor({ locale, timeZone, currency }: FormatOptions) {
    this.locale = locale;
    this.region = LOCALE_REGION_MAPPING[locale];
    this.timeZone =
      timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.currency = currency || this.getDefaultCurrency();
  }

  private getDefaultCurrency(): string {
    const regionToCurrency: Record<string, string> = {
      US: "USD",
      GB: "GBP",
      EU: "EUR",
      JP: "JPY",
      CN: "CNY",
      KR: "KRW",
      IN: "INR",
      RU: "RUB",
    };
    const region = this.region.split("-")[1];
    return regionToCurrency[region] || "USD";
  }

  formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    return new Intl.DateTimeFormat(this.region, {
      timeZone: this.timeZone,
      ...options,
    }).format(date);
  }

  formatTime(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    return new Intl.DateTimeFormat(this.region, {
      timeStyle: "medium",
      timeZone: this.timeZone,
      ...options,
    }).format(date);
  }

  formatDateTime(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    return new Intl.DateTimeFormat(this.region, {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: this.timeZone,
      ...options,
    }).format(date);
  }

  formatNumber(number: number, options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(this.region, options).format(number);
  }

  formatCurrency(
    amount: number,
    options: Intl.NumberFormatOptions = {}
  ): string {
    return new Intl.NumberFormat(this.region, {
      style: "currency",
      currency: this.currency,
      ...options,
    }).format(amount);
  }

  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(this.region, {
      numeric: "auto",
    }).format(value, unit);
  }

  formatList(items: string[]): string {
    return new Intl.ListFormat(this.region, {
      style: "long",
      type: "conjunction",
    }).format(items);
  }

  formatUnit(
    value: number,
    unit: string,
    options: Intl.NumberFormatOptions = {}
  ): string {
    return new Intl.NumberFormat(this.region, {
      style: "unit",
      unit,
      ...options,
    }).format(value);
  }
}
