import { RE6Module } from "../../components/RE6Module";
import { Post, ViewingPost } from "../../components/data/Post";
import { TagTypes } from "../../components/data/Tag";
import { PageDefintion } from "../../components/data/Page";

declare var GM_download;

/**
 * Renames the files to a user-readable scheme for download
 */
export class DownloadCustomizer extends RE6Module {

    private static instance: DownloadCustomizer;

    private post: ViewingPost;
    private link: JQuery<HTMLElement>;

    private constructor() {
        super(PageDefintion.post);
        if (!this.eval()) return;

        this.post = Post.getViewingPost();

        this.link = $("div#image-download-link a");
        this.updateLink();
    }

    /**
     * Returns a singleton instance of the class
     * @returns DownloadCustomizer instance
     */
    public static getInstance() {
        if (this.instance === undefined) this.instance = new DownloadCustomizer();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        let def_settings = {
            template: "%postid%-%artist%-%copyright%-%character%",
        };
        return def_settings;
    }

    /**
     * Creates a download link with the saved template
     */
    public updateLink() {
        let $template = this.fetchSettings("template")
            .replace(/%postid%/g, this.post.getId())
            .replace(/%artist%/g, this.post.getTagsFromType(TagTypes.Artist).join("-"))
            .replace(/%copyright%/g, this.post.getTagsFromType(TagTypes.Copyright).join("-"))
            .replace(/%character%/g, this.post.getTagsFromType(TagTypes.Character).join("-"))
            .replace(/-{2,}|-$/g, "")
            + "." + this.post.getFileExtension();
        this.link.attr("download", $template);

        this.link.click(event => {
            event.preventDefault();
            GM_download({
                url: this.link.attr("href"),
                name: this.link.attr("download"),
                saveAs: true,
            });
        });
    }

}
