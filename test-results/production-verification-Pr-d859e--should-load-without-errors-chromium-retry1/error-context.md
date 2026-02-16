# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Welcome back" [level=1] [ref=e5]
      - paragraph [ref=e6]: Sign in to your EaseMail account
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - text: Email
          - textbox "Email" [ref=e10]:
            - /placeholder: you@example.com
        - generic [ref=e11]:
          - generic [ref=e12]:
            - generic [ref=e13]: Password
            - link "Forgot password?" [ref=e14] [cursor=pointer]:
              - /url: /auth/reset-password
          - textbox "Password" [ref=e15]:
            - /placeholder: ••••••••
        - generic [ref=e16]:
          - checkbox "Remember me" [ref=e17] [cursor=pointer]
          - checkbox
          - generic [ref=e18] [cursor=pointer]: Remember me
        - button "Sign in" [ref=e19] [cursor=pointer]
      - generic [ref=e24]: Or
      - button "Send magic link" [ref=e25] [cursor=pointer]
      - paragraph [ref=e26]:
        - text: Don't have an account?
        - link "Sign up" [ref=e27] [cursor=pointer]:
          - /url: /auth/signup
  - region "Notifications alt+T"
  - alert [ref=e28]
```