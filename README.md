
ZonelyCoreFiveM
A step by step setup guide to install the ZonelyCoreFiveM plugin on your FiveM server and send commands from your website.


Before integrating your website with ZonelyCoreFiveM, ensure you use the latest official version. Download the newest ZonelyCoreFiveM release here:  
https://zonely.gen.tr/plugins/zonelycorefivem-1-0-0.zip

## 1) Prerequisites

- A running **FiveM** server (Linux or Windows).
- A **zonelycorefivem** folder under `resources/` on the server.
- Firewall or cloud firewall access (for example, to allow an HTTP port such as 30120).

## 2) Install the plugin on the server

1. Upload the `zonelycorefivem` folder into the `resources/` directory on your server.
2. Open and configure `resources/zonelycorefivem/config.json`:

```json
{
  "apiKey": "YOUR_KEY",
  "httpPort": 30120
}
```

- **apiKey**: Must match the **API Key** you will enter in the panel.
- **httpPort**: The HTTP port the plugin will listen on (for example **30120**).

3. Add this line to `server.cfg`:

```cfg
ensure zonelycorefivem
```

4. Restart the server or run `restart zonelycorefivem`.

<Tip>
  Do not confuse the game port with the plugin’s HTTP port. The plugin uses **httpPort** (for example 30120).
</Tip>

## 3) Create a server record in the panel

1. Log in to the admin panel, go to the **Miscellaneous** section (Brush icon), and open the **Servers** page.
2. Click **Add Server**.
3. Fill in the fields:
   - **Plugin**: `ZonelyCoreFiveM`
   - **Server IP Address**: The server IP or an accessible domain
   - **HTTP Port**: From `config.json` → `httpPort` (for example **30120**)
   - **API Key**: From `config.json` → `apiKey`
4. Click **Check Plugin Connection**.
5. If successful, click **Publish** to save.

<Warning>
  The **API Key** in the panel must exactly match the `apiKey` in `config.json`.
</Warning>

## 4) Troubleshooting

- **Connection failed or timed out**
  - Is `zonelycorefivem` running? (`ensure zonelycorefivem`)
  - Do `config.json` → `apiKey` and the panel’s **API Key** match?
  - Is the `httpPort` (for example 30120) allowed for the **panel IP** in your firewall or cloud firewall?
  - Does the panel server have **network access** to the game server (DNS, routing, provider firewall)?
- **404 or not found**
  - Is the folder structure correct? `resources/zonelycorefivem`
  - Does `server.cfg` include `ensure zonelycorefivem`?
  - Are there any plugin-related errors in the server console?
- **Commands appear inactive**
  - Are you using valid FiveM console commands?
  - Is the resource name correct? (`ensure my_resource`)
  - Some settings may require restarting the server or the affected resource.

## 5) Security tips

- Only authorized admins should know the **API Key**.
- Open the HTTP port (for example 30120) only to the **panel IP**.
- Serve your panel over **HTTPS**.
- Apply **rate limits** for failed attempts and log them.

## 6) FAQ

**What is the API Key and where can I find it?**  
It is in the plugin folder under `config.json` as `apiKey`. Enter the same value in the panel.

**What is the default port?**  
The example uses **30120**. Use the port defined in your own `config.json` file.

**Can I use a domain instead of an IP?**  
Yes. You can use any domain the panel can access.

**If the panel and FiveM are on the same machine, can I use 127.0.0.1?**  
Yes. If they run on different machines, use a public IP or an accessible domain.

**I get “Connection Failed.” What should I check first?**  
Ensure `ensure zonelycorefivem` is in `server.cfg`, the `apiKey` in `config.json` matches the panel value, and the port is open to the panel IP.

**Do I need an extra rule on the provider side?**  
Yes. Besides the OS firewall, create a provider-level rule that allows access from the **panel IP**.

**Can I add more than one FiveM server?**  
Yes. Create a separate record for each server and assign unique IP, port, and API Key combinations.

**How should I write commands?**  
Do not use a leading slash in the panel. For example `status`, `restart my_resource`.

<Check>
  Setup complete. You can now send commands to your FiveM server through the panel.
</Check>
