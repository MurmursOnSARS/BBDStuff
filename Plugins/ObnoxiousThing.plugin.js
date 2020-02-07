//META{"name":"ObnoxiousThing","source":"https://github.com/MurmursOnSARS/BBDStuff/blob/master/Plugins/ObnoxiousThing.plugin.js/","website":"https://github.com/MurmursOnSARS"}*//
/*@cc_on
@if (@_jscript)

	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject('WScript.Shell');
	var fs = new ActiveXObject('Scripting.FileSystemObject');
	var pathPlugins = shell.ExpandEnvironmentStrings('%APPDATA%\\BetterDiscord\\plugins');
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup('It looks like you\'ve mistakenly tried to run me directly. \n(Don\'t do that!)', 0, 'I\'m a plugin for BetterDiscord', 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup('I\'m in the correct folder already.\nJust reload Discord with Ctrl+R.', 0, 'I\'m already installed', 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup('I can\'t find the BetterDiscord plugins folder.\nAre you sure it\'s even installed?', 0, 'Can\'t install myself', 0x10);
	} else if (shell.Popup('Should I copy myself to BetterDiscord\'s plugins folder for you?', 0, 'Do you need some help?', 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec('explorer ' + pathPlugins);
		shell.Popup('I\'m installed!\nJust reload Discord with Ctrl+R.', 0, 'Successfully installed', 0x40);
	}
	WScript.Quit();

@else@*/

var ObnoxiousThing = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'ObnoxiousThing',
      authors: [
        {
          name: 'MurmursOnSARS',
          discord_id: '660699868041314334',
          github_username: 'MurmursOnSARS',
          twitter_username: 'who_uses_twitter'
        }
      ],
      version: '1.0.0',
      description: 'Turns your messages into obnoxious things. Rehash of Metalloriff\'s The Clap Best Clap Plugin Clap Ever. Also the code structure is blatantly taken from Lighty, with permission. Check out their plugins!\n\nTo use, type claps: before a message and send it to replace all spaces with 👏. Type ra: before a message and send it to replace all letters and numbers with regional indicators (huge emoji versions of letters). It\'s so awful.\n\nBest part is, you can combine them! Please don\'t use this unless you want people to hate you.',
      github: 'https://github.com/MurmursOnSARS',
      github_raw: 'https://raw.githubusercontent.com/MurmursOnSARS/BBDStuff/master/Plugins/ObnoxiousThing.plugin.js'
    }
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { Utilities, ReactComponents, Patcher, WebpackModules, DiscordModules } = Api;
    const { MessageActions } = DiscordModules;

    const substitutionsclaps = {
      ' ': ':clap:',
    };
    const substitutionsra = {
      'a': '🇦',
      'b': '🇧',
      'c': '🇨',
      'd': '🇩',
      'e': '🇪',
      'f': '🇫',
      'g': '🇬',
      'h': '🇭',
      'i': '🇮',
      'j': '🇯',
      'k': '🇰',
      'l': '🇱',
      'm': '🇲',
      'n': '🇳',
      'o': '🇴',
      'p': '🇵',
      'q': '🇶',
      'r': '🇷',
      's': '🇸',
      't': '🇹',
      'u': '🇺',
      'v': '🇻',
      'w': '🇼',
      'x': '🇽',
      'y': '🇾',
      'z': '🇿',
      '0': ':zero:',
      '1': ':one:',
      '2': ':two:',
      '3': ':three:',
      '4': ':four:',
      '5': ':five:',
      '6': ':six:',
      '7': ':seven:',
      '8': ':eight:',
      '9': ':nine:'
    };
    const substituteclaps = str => {
      const replacements = Object.keys(substitutionsclaps);
      replacements.forEach(x => (str = str.replace(new RegExp(x, 'g'), substitutionsclaps[x])));
      return str;
    };
    const substitutera = str => {
      const replacements = Object.keys(substitutionsra).reverse(); //reversed to make all letters finish before numbers
      replacements.forEach(x => (str = str.replace(new RegExp(x, 'g'), substitutionsra[x])));
      return str;
    };
    const claps = str => substituteclaps(str);
    const ra = str => substitutera(str);

    return class ObnoxiousThing extends Plugin {
      onStart() {
        this.promises = { state: { cancelled: false } };
        this.patchAll();
      }
      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
      }

      /* PATCHES */
      patchAll() {
        this.patchSendMessage();
      }
      patchSendMessage() {
        Patcher.before(MessageActions, 'sendMessage', (_this, [_, message]) => {
          if (!message.content.length || !(message.content.slice(0, 6) == 'claps:' || message.content.slice(0, 3) == 'ra:')) return;
          if (message.content.slice(0,6) == 'claps:' && message.content.slice(6,9) !== 'ra:') { //claps only
            message.content = claps(message.content.substr(6));
            return;
          }
          if (message.content.slice(0, 3) == 'ra:' && message.content.slice(3,9) !== 'claps:') { //ra only
            message.content = ra(message.content.substr(3));
            return;
          }
          message.content = claps(ra(message.content.substr(9)));
        });
      }
      /* PATCHES */

      get [Symbol.toStringTag]() {
        return 'Plugin';
      }
      get name() {
        return config.info.name;
      }
      get short() {
        let string = '';

        for (let i = 0, len = config.info.name.length; i < len; i++) {
          const char = config.info.name[i];
          if (char === char.toUpperCase()) string += char;
        }

        return string;
      }
      get author() {
        return config.info.authors.map(author => author.name).join(', ');
      }
      get version() {
        return config.info.version;
      }
      get description() {
        return config.info.description;
      }
    };
  };

  /* Finalize */

  return !global.ZeresPluginLibrary
    ? class {
        getName() {
          return this.name.replace(/\s+/g, '');
        }
        getAuthor() {
          return this.author;
        }
        getVersion() {
          return this.version;
        }
        getDescription() {
          return this.description;
        }
        stop() {}
        load() {
          const header = `Missing Library`;
          const content = `The Library ZeresPluginLibrary required for ${this.name} is missing.`;
          const ModalStack = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey');
          const TextElement = BdApi.findModuleByProps('Sizes', 'Weights');
          const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() === 'confirm-modal');
          const onFail = () => BdApi.getCore().alert(header, `${content}<br/>Due to a slight mishap however, you'll have to download the library yourself.<br/><br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/rauenzi/BDPluginLibrary/blob/master/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>`);
          if (!ModalStack || !ConfirmationModal || !TextElement) return onFail();
          ModalStack.push(props => {
            return BdApi.React.createElement(
              ConfirmationModal,
              Object.assign(
                {
                  header,
                  children: [TextElement({ color: TextElement.Colors.PRIMARY, children: [`${content} Please click Download Now to install it.`] })],
                  red: false,
                  confirmText: 'Download Now',
                  cancelText: 'Cancel',
                  onConfirm: () => {
                    const request = require('request');
                    const fs = require('fs');
                    const path = require('path');
                    const waitForLibLoad = callback => {
                      if (!global.BDEvents) return callback();
                      const onLoaded = e => {
                        if (e !== 'ZeresPluginLibrary') return;
                        BDEvents.off('plugin-loaded', onLoaded);
                        callback();
                      };
                      BDEvents.on('plugin-loaded', onLoaded);
                    };
                    request('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (error, response, body) => {
                      if (error) return onFail();
                      fs.writeFile(path.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), body, () => {});
                      waitForLibLoad(() => pluginModule.reloadPlugin(this.name));
                    });
                  }
                },
                props
              )
            );
          });
        }
        start() {}
        get [Symbol.toStringTag]() {
          return 'Plugin';
        }
        get name() {
          return config.info.name;
        }
        get short() {
          let string = '';
          for (let i = 0, len = config.info.name.length; i < len; i++) {
            const char = config.info.name[i];
            if (char === char.toUpperCase()) string += char;
          }
          return string;
        }
        get author() {
          return config.info.authors.map(author => author.name).join(', ');
        }
        get version() {
          return config.info.version;
        }
        get description() {
          return config.info.description;
        }
      }
    : buildPlugin(global.ZeresPluginLibrary.buildPlugin(config));
})();

/*@end@*/
