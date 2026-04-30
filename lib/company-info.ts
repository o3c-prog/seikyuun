export type CompanyInfo = {
  name: string;
  representative?: string;
  postalCode?: string;
  address: string;
  tel?: string;
  fax?: string;
  contactPerson?: string;
  registrationNumber?: string;
  bankAccount?: string;
};

// TODO: ユーザー設定で上書き可能にする
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "O3Creations",
  representative: "尾本 耕佑",
  postalCode: "525-0048",
  address: "滋賀県草津市追分南5-15-5",
  tel: "080-4132-6639",
  registrationNumber: "T6810447437806",
  bankAccount:
    "三菱UFJ銀行 草津支店 普通 4554393\n口座名義 尾本 耕佑\n※お振込み手数料は貴社ご負担にてお願い致します。",
};
