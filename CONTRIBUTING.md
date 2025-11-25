# Contributing to Control Panel for X

Thank you for your interest in contributing! This is a simple, focused extension with just 2 features.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](../../issues)
2. If not, create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Chrome version
   - Screenshots if applicable

### Suggesting Enhancements

We're committed to keeping this extension **simple with just 2 features**:
- Hide verified accounts' tweets
- Hide ads

Enhancement suggestions should focus on **improving these 2 features**, not adding new ones.

Good suggestions:
- ✅ Improve ad detection accuracy
- ✅ Better performance optimization
- ✅ Fix bugs in verified account detection
- ✅ UI/UX improvements for existing features

Not accepted:
- ❌ Adding new features (keeps extension simple)
- ❌ Feature bloat
- ❌ Complexity increases

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Make your changes
4. Test thoroughly on X/Twitter
5. Commit with clear messages
6. Push to your fork
7. Create a Pull Request

### Code Style

- Use clear, descriptive variable names
- Add comments for complex logic
- Keep functions small and focused
- Follow existing code patterns
- Test on both twitter.com and x.com

### Testing Checklist

Before submitting PR, verify:
- ✅ Works on Following timeline
- ✅ Works on For You timeline
- ✅ Verified accounts you follow are visible
- ✅ Verified accounts you don't follow are hidden
- ✅ Ads are blocked (if feature enabled)
- ✅ Settings save and load correctly
- ✅ No console errors
- ✅ Performance is acceptable

## Development Setup

1. Clone the repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `x-control-panel` folder
6. Make changes and test
7. Click reload icon in chrome://extensions/ to test changes

## Questions?

Open an issue for questions or discussions!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
