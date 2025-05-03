# 使用官方 Nginx 镜像作为基础镜像
FROM nginx:alpine

# 将项目文件复制到 Nginx 的默认 HTML 目录
# 注意：这里假设您的 HTML, CSS, JS 文件都在根目录或子目录下
# 如果文件结构不同，您可能需要调整 COPY 指令
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./css /usr/share/nginx/html/css
COPY ./js /usr/share/nginx/html/js
COPY ./src /usr/share/nginx/html/src

# 暴露 80 端口
EXPOSE 80

# 容器启动时运行 Nginx
CMD ["nginx", "-g", "daemon off;"]