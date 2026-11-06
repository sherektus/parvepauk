# Parvepauk

**Parvepauk** on kahe mängijaga kordamööda mängitav pikslistiilis parveduell, kus mängijad sihivad kahuriga, püüavad vastase meeskonna parvelt vette lükata, loovad telefoniga endast pikslikapteni ja keerutavad pärast lasku riskiratast.

## Kuidas mängu käivitada

1. Ava terminal selles kaustas ja paigalda sõltuvused (kui pole veel paigaldatud):
   ```bash
   npm install
   ```
2. Käivita arendusserver:
   ```bash
   npm run dev
   ```
3. Ava brauseris kuvatud aadress (nt `http://localhost:5173`).

## Kuidas telefoniga QR-koodi kaudu tegelast lisada

- Vali avakuval **„Tegelase lisamine“**.
- Veendu, et sinu telefon ja arvuti on **samas WiFi-võrgus**.
- Skanni oma mängija QR-kood telefoni kaameraga – telefonis avaneb mänguseansiga seotud mobiilileht.
- Tee endast pilt, kärbi seda, vaata pikslikunsti eelvaadet ja vajuta **„Kasuta tegelasena“**.
- Pilt töödeldakse otse telefonis pikslikunsti avatariks, saadetakse kohe arvutivaatesse ja ajutised pildiandmed kustutatakse. Mängu lõppedes QR-kood aegub.
