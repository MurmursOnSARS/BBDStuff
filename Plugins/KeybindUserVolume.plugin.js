//META{"name":"KeybindUserVolume","source":"https://github.com/MurmursOnSARS/BBDStuff/blob/master/Plugins/KeybindUserVolume.plugin.js/","website":"https://github.com/MurmursOnSARS","authorId":"660699868041314334"}*//
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

var KeybindUserVolume = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'KeybindUserVolume',
      authors: [
        {
          name: 'MurmursOnSARS',
          discord_id: '660699868041314334',
          github_username: 'MurmursOnSARS',
          twitter_username: 'who_uses_twitter'
        }
      ],
      version: '1.0.0',
      description: 'Use a custom keybind to control any user\'s volume, even when discord isn\'t focused. Seems kinda niche though.',
      github: 'https://github.com/MurmursOnSARS',
      github_raw: 'https://raw.githubusercontent.com/MurmursOnSARS/BBDStuff/master/Plugins/KeybindUserVolume.plugin.js'
    },
    changelog: [
      {
        title: 'Hello party people!!!',
        type: 'added',
        items: ['Spring break is coming!']
      }
    ],
    defaultConfig: [
      {
        type: 'textbox',
        id: 'userids',
        value: '',
        name: 'User IDs',
        note: 'Enter the user IDs whose volumes you want to control, separated by commas'
      },
      {
        type: 'keybind',
        id: 'volumeUp',
        value: [68],
        name: 'Increase Volume Keybind'
      },
      {
        type: 'keybind',
        id: 'volumeDown',
        value: [69],  // haha funny number
        name: 'Decrease Volume Keybind',
        onChange: [(x) => console.log(x)]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { WebpackModules } = Api;
    // why can't discord follow standards reeee
    const allKeyCodes = {
      4: 'a',
      5: 'b',
      6: 'c',
      7: 'd',
      8: 'e',
      9: 'f',
      10: 'g',
      11: 'h',
      12: 'i',
      13: 'j',
      14: 'k',
      15: 'l',
      16: 'm',
      17: 'n',
      18: 'o',
      19: 'p',
      20: 'q',
      21: 'r',
      22: 's',
      23: 't',
      24: 'u',
      25: 'v',
      26: 'w',
      27: 'x',
      28: 'y',
      29: 'z',
      30: '1',
      31: '2',
      32: '3',
      33: '4',
      34: '5',
      35: '6',
      36: '7',
      37: '8',
      38: '9',
      39: '0',
      40: 'return',
      41: 'escape',
      42: 'backspace', // even though it's delete on macs
      43: 'tab',
      44: 'space',
      45: '-',
      46: '=',
      47: '[',
      48: ']',
      49: '\\',
      // 50 unknown (probably delete)
      51: ';',
      52: '\'',
      53: '`',
      54: ',',
      55: '.',
      56: '/',
      57: 'capslock',
      58: 'F1',
      59: 'F2',
      60: 'F3',
      61: 'F4',
      62: 'F5',
      63: 'F6',
      64: 'F7',
      65: 'F8',
      66: 'F9',
      67: 'F10',
      68: 'F11',
      69: 'F12',
      // unknown 70-78
      79: 'right',
      80: 'left',
      81: 'down',
      82: 'up',
      // unknown big gap
    };
    const allModifiers = {
      224: 'control',
      225: 'shift',
      226: 'option',
      227: 'super',
      229: 'shift',
      230: 'option',
      231: 'super'
    };
    var setLV = WebpackModules.getByProps('setLocalVolume');
    var getLV = WebpackModules.getByProps('getLocalVolume').__proto__;
    var electron = require("electron");
    
    return class KeybindUserVolume extends Plugin {
      
      onStart() {
        var volUpBind = this.keyCheck(this.settings.volumeUp,'up');
        var volDownBind = this.keyCheck(this.settings.volumeDown,'down'); 
      }
      onStop() {
        this.unlisten();
      }
      
      keyCheck(array,type) {
        if(!array.some(el => allKeyCodes[el])) return console.log('you messed up fool');
        var string = '';
        array.forEach(el => {
          if(string !== '') string += '+';
          if(!!allKeyCodes[el]) string += allKeyCodes[el];
          if(!!allModifiers[el]) string += allModifiers[el];
        });
        console.log(string);
        this.listen(string,type);
      }

      /* Listener */
      listen(string,type) {
        if(type === 'up') {
          electron.remote.globalShortcut.register(string, () => {
	          setLV.setLocalVolume(this.settings.userids, getLV.getLocalVolume(this.settings.userids) + 20);  // logarithmic BS
          });
        }
        if(type === 'down') {
          electron.remote.globalShortcut.register(string, () => {
	          setLV.setLocalVolume(this.settings.userids, getLV.getLocalVolume(this.settings.userids) - 20);  // logarithmic BS
          });
        }
      }
      
      unlisten() {
        electron.remote.globalShortcut.unregisterAll();
      }
      /* Listener */
      
      getSettingsPanel() {
        return this.buildSettingsPanel().getElement();
      }
      
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
