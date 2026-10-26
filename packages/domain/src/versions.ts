export interface ProductVersion {
  version: string;
  date: string;
  features: string[];
  changes: string[];
}

export const productVersions: ProductVersion[] = [
  {
    version: "1.5.0",
    date: "2026-10-26",
    features: [
      "Sporcu kartı listeden ayrı açılır. Boy, kilo, not ve basket geçmişi kartta takip edilir.",
      "Takım listeden ayrı açılır. Kadro, takım kartının içinde ayrıca kaydedilir.",
      "Takım türü spor okulu veya takımdır. Sezon, sistemin açtığı yıl çiftinden seçilir. Şube boş kalabilir.",
      "Personel unvanı kulüp başkanı, başantrenör, antrenör veya mali işler yetkili olur.",
    ],
    changes: [
      "Sporcu adı ve Kart, takip sayfasını açar. Düzelt yalnız kayıt formunu açar.",
      "Karttaki başlangıç, aylık ölçü, not ve geçmişin her birinin kendi kaydı vardır.",
      "Takım açmak kadro yazmak değildir. Sporcu ekleme ve çıkarma takım kartında kaydedilir.",
      "Takım formunda kategori yoktur. Tür, Takım oyuncusu diye yazılmaz. Şube seçilmezse ilk şube atanmaz.",
      "Personel önce listelenir. Yeni kayıt sağ üstten, düzeltme satırdan açılır ve içeride kaydedilir.",
      "Takım antrenörü yalnız başantrenör ve antrenörden seçilir. Aidat tarafındaki personel unvanı mali işler yetkilidir.",
      "Eski personel unvanları listede durur. Yeni seçim listesinde yoktur.",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-10-26",
    features: [
      "Aidat ay ay açılır. Geçmiş ve gelecek aylar aynı ekranda durur.",
      "Sporcu listesi ve takım listesi ayrıdır. Takımın toplamı da görünür.",
      "Aidat tutarı sporcunun fiyat anlaşmasından gelir. Ay için ayrıca yazılabilir.",
      "Tahsilat günü ve türü yazılır: nakit, havale veya kart.",
      "Kısmi ödeme kalır. Yeni ödeme eklenir, yanlış ödeme çıkarılır.",
    ],
    changes: [
      "Ara veren ve ayrılan sporcuya bu ay ve sonrası otomatik aidat açılmaz. Geçmiş ayları durur.",
      "Anlaşması olmayan sporcuda tutar boş kalır. Fiyat kayıttan gelince aylar dolar.",
      "Ücretsiz anlaşma o ayı ücretsiz gösterir.",
      "Aidat listesi sporcu listesi gibi açılır. Ay süzgeci vardır. Tahsilat, sağ üstteki Aidat al ile içeride yönetilir.",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-10-26",
    features: [
      "Tesis, branş, fiyat ve sporcu kayıtları önce listelenir. Yeni kayıt sağ üstten, düzeltme satırdan açılır.",
      "Tesis adı, türü ve kapasitesi düzenlenir. Programı olan tesis silinemez.",
      "Branş adı yazılır ve yıl çifti sezon seçilir. Sezonu sistem yöneticisi açar.",
      "Fiyat adı ve tutarı düzenlenir. Sporcu kaydı bu listeden ücret seçer.",
      "Kayıtta anne ve baba ayrı tutulur. Listede görünen ana veli kaydı yapan seçer.",
      "Acil yakın istenirse yazılır. Zorunlu değildir.",
      "İndirim, yüzde listesinden seçilir veya özel fiyat yazılır.",
      "Sporcu listesi tür, branş, grup, ücret, kayıt tarihi ve duruma göre süzülür.",
      "Excel, kayıtta alınan bütün alanlarla iner. Süzgeç varsa yalnız görünen satırlar iner.",
    ],
    changes: [
      "Şube kaydı şimdilik yok. Tesis doğrudan açılır.",
      "Sezon elle yazılmaz. Başlangıç ve bitiş kulüp tarafından girilmez. Yürüyüş seçilmez.",
      "Açılan branşın adı düzeltilebilir.",
      "Kayıtlarda kullanılan fiyat silinemez.",
      "Anne veya babadan biri yeter. Seçilen veli listelerde görünür.",
      "Yüzde indirimi küçükten büyüğe gider. Ücretsiz (%100 burslu) listenin sonundadır.",
      "Kayıt tarihi gün, ay ve yıl olarak yazılır. Yanındaki sütun kaç yıldır kayıtlı olduğunu gösterir.",
      "Seçilen liste filtreleri temizlenebilir.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-10-26",
    features: [
      "Kulüp sahibi şube açar: ad, ilçe ve adres.",
      "Her şubeye tesis eklenir. Tür salon, saha, stüdyo veya havuz olabilir; kapasite girilir.",
      "Boş şube ve kullanılmayan tesis çıkarılır.",
      "Versionlar her kulüp sitesinin sol menüsünde durur. Her sürüm özellikleri ve değişiklikleri ayrı listeler.",
    ],
    changes: [
      "Kadro, seans, depo veya duran bir tesis varken şube çıkmaz.",
      "Seansın kullandığı tesis çıkmaz.",
      "Aynı adda şube, aynı şubede aynı adda tesis tekrar açılmaz.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-10-26",
    features: [
      "Kulüp sitesi kendi adresinde açılır. Yerel adres de bu kulübün sitesidir.",
      "Giriş yalnız bu kulübün web personelini kabul eder.",
    ],
    changes: [
      "Görünen kulüp adı Yeni Ufuklar. Logo, kırmızı düğme ve lacivert giriş kullanılır.",
      "Yönetim ekranı açık kaldı: beyaz menü, açık sayfa, beyaz kartlar.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-26",
    features: [
      "Sporcu ve üye, takım, antrenman takvimi, yoklama ve seans rezervasyonu.",
      "Stok, zimmet, aidat ve personel.",
      "Bildirim, rapor ve işlem geçmişi.",
      "Ekran yetkileri: sahip, yönetici, şube müdürü, finans, depo ve antrenör.",
    ],
    changes: [
      "Şube müdürü yalnız yetkili şubesinin kayıtlarını görür.",
      "Antrenör yalnız atandığı grubu görür.",
    ],
  },
];

export function currentProductVersion() {
  return productVersions[0];
}
