# SSH Troubleshooting Guide for Windows

If you are trying to SSH into an AWS EC2 instance (or any Linux server) from Windows using a `.pem` file and encounter either:

1. **"Bad permissions"** / **"WARNING: UNPROTECTED PRIVATE KEY FILE!"**
2. **"Permission denied (publickey)"**

Here is the ultimate guide to fixing both issues on Windows.

---

## Issue 1: "Bad permissions" on the `.pem` file

OpenSSH on Windows is very strict. If your `.pem` file has permissions that allow other users or system services to read it, SSH will reject it entirely and refuse to connect. 

### The Fix (PowerShell Script)

**Do not try to fix this via the Windows GUI** (Right Click -> Properties -> Security). It almost always leaves behind inherited permissions (like `NT AUTHORITY\SYSTEM` or `Administrators`) that OpenSSH will still complain about.

Instead, run this exact script in **PowerShell**. It strips away all background permissions and grants exclusive "Read" access ONLY to you.

```powershell
# 1. Provide the exact path to your key
$pem = "$env:USERPROFILE\.ssh\campus-mate-key-v2.pem"

# 2. Get your exact domain\username format
$fullUser = "$env:USERDOMAIN\$env:USERNAME"

# 3. Strip all permissions and grant only to you
takeown /f $pem
icacls $pem /reset
icacls $pem /inheritance:r
icacls $pem /remove:g "BUILTIN\Administrators" 2>$null
icacls $pem /remove:g "NT AUTHORITY\SYSTEM"    2>$null
icacls $pem /remove:g "Everyone"               2>$null
icacls $pem /remove:g "Users"                  2>$null
icacls $pem /grant "$fullUser`:R"

# 4. Verify it worked (You should only see one line with your username and ":(R)")
icacls $pem
```

Once that cleanly outputs *only* your user, the "Bad permissions" error is permanently solved for that file.

---

## Issue 2: "Permission denied (publickey)"

If you fixed the file permissions but you still get **"Permission denied (publickey)"**, or if it starts **asking for a password** (which AWS Ubuntu instances do not have):

This means **your SSH key is perfectly fine**, but the **EC2 Server is rejecting it**. 

### Causes:
- You lost the original key and are trying to use a brand new `.pem` file that the server doesn't know about yet.
- The `~/.ssh/authorized_keys` file on the server was accidentally wiped or its permissions got corrupted.

### The Fix (Option A: If you still have the old working key)
SSH in with the old working key and manually add the new key's public string to `~/.ssh/authorized_keys`.

### The Fix (Option B: The "Nuclear" Option)
If you are locked out of the server completely and it's asking for a password, AWS prevents you from injecting new keys to existing servers natively. 

If this server doesn't have critical data you need to save:
1. Go to AWS Console -> EC2 -> Instances.
2. Select the locked instance and select **Terminate instance**.
3. Click **Launch instances**.
4. Set it up using the exact same specs.
5. In the **"Key pair name"** dropdown, select the named key that you just fixed locally on Windows.
6. Launch it.
7. Go to **Elastic IPs** and re-associate your IP address to the new server.
8. Clear your old known host in PowerShell: `ssh-keygen -R YOUR_IP_ADDRESS`
9. SSH in immediately: `ssh -i "$env:USERPROFILE\.ssh\campus-mate-key-v2.pem" ubuntu@YOUR_IP_ADDRESS`

It will connect instantly since the new server was explicitly created knowing about your fixed local key.
